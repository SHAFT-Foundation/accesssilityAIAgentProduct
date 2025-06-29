import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ContainerConfig, SecurityContext, AuditEntry } from '../types/scan';

export class ContainerManager {
  private docker: Docker;
  private activeContainers: Map<string, SecurityContext> = new Map();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.docker = new Docker();
    this.startCleanupTimer();
  }

  async createSecureContainer(config: ContainerConfig): Promise<string> {
    const containerId = uuidv4();
    const startTime = new Date();

    try {
      // Create container with security restrictions
      const container = await this.docker.createContainer({
        Image: config.image,
        name: `accessibility-scanner-${containerId}`,
        Hostname: 'scanner',
        User: 'scanner:scanner', // Non-root user
        WorkingDir: '/app',
        Env: Object.entries(config.environment).map(([key, value]) => `${key}=${value}`),
        Cmd: ['node', 'scan.js'],
        
        // Resource limits
        HostConfig: {
          Memory: this.parseMemory(config.memory),
          MemorySwap: this.parseMemory(config.memory), // No swap
          CpuQuota: this.parseCpu(config.cpu),
          CpuPeriod: 100000,
          PidsLimit: 50, // Limit number of processes
          
          // Network isolation
          NetworkMode: config.networkMode === 'isolated' ? 'accessibility-scanner' : 'none',
          
          // Security options
          SecurityOpt: [
            'no-new-privileges:true',
            'seccomp:unconfined', // Puppeteer needs some syscalls
          ],
          
          // Capabilities - remove all dangerous ones
          CapDrop: ['ALL'],
          CapAdd: ['SETUID', 'SETGID'], // Minimal caps for Puppeteer
          
          // Bind mounts (read-only where possible)
          Binds: config.volumes.map(vol => 
            `${vol.host}:${vol.container}:${vol.readonly ? 'ro' : 'rw'}`
          ),
          
          // Temporary filesystem for writable areas
          Tmpfs: {
            '/tmp': 'rw,noexec,nosuid,size=100m',
            '/var/tmp': 'rw,noexec,nosuid,size=50m'
          },
          
          // Auto-remove container when it exits
          AutoRemove: config.removeOnExit,
          
          // Resource monitoring
          OomKillDisable: false,
        },
        
        // Labels for tracking
        Labels: {
          'scanner.type': 'accessibility',
          'scanner.id': containerId,
          'scanner.created': startTime.toISOString(),
          'scanner.timeout': config.timeout.toString(),
        },
      });

      // Initialize security context
      const securityContext: SecurityContext = {
        containerId,
        startTime,
        resources: {
          memory: this.parseMemory(config.memory),
          cpu: this.parseCpu(config.cpu),
          diskUsage: 0,
        },
        networkActivity: {
          outboundRequests: 0,
          blockedRequests: 0,
        },
        auditLog: [],
      };

      this.activeContainers.set(containerId, securityContext);
      this.addAuditEntry(containerId, 'container_created', {
        image: config.image,
        memory: config.memory,
        cpu: config.cpu,
        networkMode: config.networkMode,
      });

      // Start the container
      await container.start();
      this.addAuditEntry(containerId, 'container_started', {});

      // Set up timeout
      setTimeout(() => {
        this.forceCleanupContainer(containerId, 'timeout');
      }, config.timeout);

      logger.info(`Container ${containerId} created and started`, {
        containerId,
        image: config.image,
        memory: config.memory,
        cpu: config.cpu,
      });

      return containerId;
    } catch (error) {
      logger.error(`Failed to create container ${containerId}`, {
        containerId,
        error: error.message,
      });
      
      // Clean up partial state
      this.activeContainers.delete(containerId);
      throw error;
    }
  }

  async executeInContainer(containerId: string, command: string[]): Promise<string> {
    try {
      const container = this.docker.getContainer(`accessibility-scanner-${containerId}`);
      
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Detach: false });
      
      return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';

        stream.on('data', (chunk: Buffer) => {
          const data = chunk.toString();
          if (data.startsWith('\u0001')) {
            output += data.substring(8); // Remove Docker stream header
          } else if (data.startsWith('\u0002')) {
            errorOutput += data.substring(8); // stderr
          }
        });

        stream.on('end', () => {
          if (errorOutput) {
            this.addAuditEntry(containerId, 'command_error', {
              command,
              error: errorOutput,
            });
            reject(new Error(errorOutput));
          } else {
            this.addAuditEntry(containerId, 'command_executed', {
              command,
              outputLength: output.length,
            });
            resolve(output);
          }
        });

        stream.on('error', (error) => {
          this.addAuditEntry(containerId, 'command_failed', {
            command,
            error: error.message,
          });
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`Failed to execute command in container ${containerId}`, {
        containerId,
        command,
        error: error.message,
      });
      throw error;
    }
  }

  async cleanupContainer(containerId: string, reason: string = 'completed'): Promise<void> {
    try {
      const context = this.activeContainers.get(containerId);
      if (!context) {
        logger.warn(`Container ${containerId} not found in active containers`);
        return;
      }

      context.endTime = new Date();
      this.addAuditEntry(containerId, 'container_cleanup_started', { reason });

      const container = this.docker.getContainer(`accessibility-scanner-${containerId}`);
      
      // Get final stats
      try {
        const stats = await container.stats({ stream: false });
        context.resources.diskUsage = stats.blkio_stats?.io_service_bytes_recursive?.[0]?.value || 0;
      } catch (statsError) {
        logger.warn(`Failed to get final stats for container ${containerId}`, {
          error: statsError.message,
        });
      }

      // Stop container gracefully
      try {
        await container.stop({ t: 10 }); // 10 second grace period
        this.addAuditEntry(containerId, 'container_stopped', {});
      } catch (stopError) {
        logger.warn(`Failed to stop container gracefully ${containerId}`, {
          error: stopError.message,
        });
      }

      // Force remove if auto-remove is disabled
      try {
        await container.remove({ force: true, v: true });
        this.addAuditEntry(containerId, 'container_removed', {});
      } catch (removeError) {
        logger.warn(`Failed to remove container ${containerId}`, {
          error: removeError.message,
        });
      }

      // Log final audit summary
      const duration = context.endTime.getTime() - context.startTime.getTime();
      logger.info(`Container ${containerId} cleaned up`, {
        containerId,
        reason,
        duration,
        auditLogEntries: context.auditLog.length,
        resources: context.resources,
      });

      this.activeContainers.delete(containerId);
    } catch (error) {
      logger.error(`Failed to cleanup container ${containerId}`, {
        containerId,
        error: error.message,
      });
      
      // Force cleanup
      this.activeContainers.delete(containerId);
    }
  }

  async forceCleanupContainer(containerId: string, reason: string): Promise<void> {
    try {
      const container = this.docker.getContainer(`accessibility-scanner-${containerId}`);
      await container.kill({ signal: 'SIGKILL' });
      await container.remove({ force: true, v: true });
      
      this.addAuditEntry(containerId, 'container_force_killed', { reason });
      this.activeContainers.delete(containerId);
      
      logger.warn(`Container ${containerId} force cleaned up`, {
        containerId,
        reason,
      });
    } catch (error) {
      logger.error(`Failed to force cleanup container ${containerId}`, {
        containerId,
        error: error.message,
      });
    }
  }

  async getContainerStats(containerId: string): Promise<any> {
    try {
      const container = this.docker.getContainer(`accessibility-scanner-${containerId}`);
      return await container.stats({ stream: false });
    } catch (error) {
      logger.error(`Failed to get stats for container ${containerId}`, {
        containerId,
        error: error.message,
      });
      return null;
    }
  }

  getSecurityContext(containerId: string): SecurityContext | undefined {
    return this.activeContainers.get(containerId);
  }

  async listActiveContainers(): Promise<string[]> {
    return Array.from(this.activeContainers.keys());
  }

  private addAuditEntry(containerId: string, action: string, details: Record<string, any>): void {
    const context = this.activeContainers.get(containerId);
    if (context) {
      const entry: AuditEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        action,
        details,
        severity: this.getAuditSeverity(action),
      };
      
      context.auditLog.push(entry);
      
      // Log important events
      if (entry.severity === 'error' || entry.severity === 'warning') {
        logger.warn(`Container audit event: ${action}`, {
          containerId,
          action,
          details,
          severity: entry.severity,
        });
      }
    }
  }

  private getAuditSeverity(action: string): 'info' | 'warning' | 'error' {
    if (action.includes('error') || action.includes('failed') || action.includes('kill')) {
      return 'error';
    }
    if (action.includes('timeout') || action.includes('force')) {
      return 'warning';
    }
    return 'info';
  }

  private parseMemory(memory: string): number {
    const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = memory.toLowerCase().match(/^(\d+)([kmg]?)$/);
    if (!match) throw new Error(`Invalid memory format: ${memory}`);
    
    const [, amount, unit] = match;
    return parseInt(amount) * (units[unit as keyof typeof units] || 1);
  }

  private parseCpu(cpu: string): number {
    // Convert CPU percentage to quota (100% = 100000)
    const percentage = parseFloat(cpu.replace('%', ''));
    return Math.floor(percentage * 1000);
  }

  private startCleanupTimer(): void {
    // Clean up orphaned containers every 5 minutes
    this.cleanupTimer = setInterval(async () => {
      try {
        const containers = await this.docker.listContainers({
          all: true,
          filters: {
            label: ['scanner.type=accessibility'],
          },
        });

        for (const containerInfo of containers) {
          const labels = containerInfo.Labels || {};
          const created = new Date(labels['scanner.created']);
          const timeout = parseInt(labels['scanner.timeout'] || '0');
          
          if (Date.now() - created.getTime() > timeout + 60000) {
            // Container has exceeded timeout by 1 minute
            const containerId = labels['scanner.id'];
            logger.warn(`Cleaning up orphaned container ${containerId}`);
            await this.forceCleanupContainer(containerId, 'orphaned');
          }
        }
      } catch (error) {
        logger.error('Failed to clean up orphaned containers', {
          error: error.message,
        });
      }
    }, 5 * 60 * 1000);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down container manager');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Clean up all active containers
    const activeContainerIds = Array.from(this.activeContainers.keys());
    await Promise.all(
      activeContainerIds.map(id => 
        this.forceCleanupContainer(id, 'shutdown')
      )
    );

    logger.info('Container manager shutdown complete');
  }
}