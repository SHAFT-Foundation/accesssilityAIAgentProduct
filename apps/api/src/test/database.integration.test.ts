import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import './integration-setup';

describe('Database Integration Tests', () => {
  describe('User Management', () => {
    it('should create and retrieve users', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        githubId: '123456',
        role: 'user'
      };

      const user = await global.testPrisma.user.create({
        data: userData
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.createdAt).toBeInstanceOf(Date);

      const retrieved = await global.testPrisma.user.findUnique({
        where: { id: user.id }
      });

      expect(retrieved).toBeTruthy();
      expect(retrieved!.email).toBe(userData.email);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'unique@example.com',
        name: 'User One',
        githubId: '111111'
      };

      await global.testPrisma.user.create({ data: userData });

      // Attempt duplicate email
      await expect(
        global.testPrisma.user.create({
          data: {
            ...userData,
            name: 'User Two',
            githubId: '222222'
          }
        })
      ).rejects.toThrow();
    });

    it('should update user preferences', async () => {
      const user = await global.createTestUser();

      const updatedUser = await global.testPrisma.user.update({
        where: { id: user.id },
        data: {
          preferences: {
            emailNotifications: true,
            scanCompletionEmails: false,
            weeklyReports: true
          }
        }
      });

      expect(updatedUser.preferences).toEqual({
        emailNotifications: true,
        scanCompletionEmails: false,
        weeklyReports: true
      });
    });
  });

  describe('Repository Management', () => {
    let user: any;

    beforeEach(async () => {
      user = await global.createTestUser();
    });

    it('should create repository with relationships', async () => {
      const repoData = {
        name: 'test-repo',
        fullName: 'user/test-repo',
        url: 'https://github.com/user/test-repo',
        userId: user.id,
        private: false,
        defaultBranch: 'main'
      };

      const repository = await global.testPrisma.repository.create({
        data: repoData,
        include: {
          user: true,
          scans: true
        }
      });

      expect(repository.user.id).toBe(user.id);
      expect(repository.scans).toHaveLength(0);
      expect(repository.name).toBe(repoData.name);
    });

    it('should update repository settings', async () => {
      const repository = await global.createTestRepository(user.id);

      const updated = await global.testPrisma.repository.update({
        where: { id: repository.id },
        data: {
          scanOnPush: true,
          autoCreatePRs: false,
          scanSettings: {
            wcagLevel: 'AAA',
            includeWarnings: true,
            excludePaths: ['node_modules/', 'dist/']
          }
        }
      });

      expect(updated.scanOnPush).toBe(true);
      expect(updated.autoCreatePRs).toBe(false);
      expect(updated.scanSettings).toEqual({
        wcagLevel: 'AAA',
        includeWarnings: true,
        excludePaths: ['node_modules/', 'dist/']
      });
    });

    it('should cascade delete repository data', async () => {
      const repository = await global.createTestRepository(user.id);
      const scan = await global.createTestScan(repository.id);
      const issue = await global.createTestIssue(scan.id);

      // Delete repository should cascade
      await global.testPrisma.repository.delete({
        where: { id: repository.id }
      });

      // Verify cascaded deletions
      const deletedScan = await global.testPrisma.scan.findUnique({
        where: { id: scan.id }
      });
      const deletedIssue = await global.testPrisma.accessibilityIssue.findUnique({
        where: { id: issue.id }
      });

      expect(deletedScan).toBeNull();
      expect(deletedIssue).toBeNull();
    });
  });

  describe('Scan Management', () => {
    let user: any;
    let repository: any;

    beforeEach(async () => {
      user = await global.createTestUser();
      repository = await global.createTestRepository(user.id);
    });

    it('should create scan with proper timestamps', async () => {
      const scanData = {
        repositoryId: repository.id,
        status: 'in_progress',
        branch: 'main',
        commit: 'abc123',
        triggerType: 'manual',
        startedAt: new Date()
      };

      const scan = await global.testPrisma.scan.create({
        data: scanData
      });

      expect(scan.id).toBeDefined();
      expect(scan.status).toBe('in_progress');
      expect(scan.startedAt).toBeInstanceOf(Date);
      expect(scan.createdAt).toBeInstanceOf(Date);
    });

    it('should update scan status and completion', async () => {
      const scan = await global.createTestScan(repository.id, {
        status: 'in_progress'
      });

      const completedScan = await global.testPrisma.scan.update({
        where: { id: scan.id },
        data: {
          status: 'completed',
          issuesFound: 5,
          completedAt: new Date(),
          scanResults: {
            totalChecks: 10,
            passedChecks: 5,
            failedChecks: 5,
            warningChecks: 0
          }
        }
      });

      expect(completedScan.status).toBe('completed');
      expect(completedScan.issuesFound).toBe(5);
      expect(completedScan.completedAt).toBeInstanceOf(Date);
      expect(completedScan.scanResults).toEqual({
        totalChecks: 10,
        passedChecks: 5,
        failedChecks: 5,
        warningChecks: 0
      });
    });

    it('should query scans with filters', async () => {
      // Create multiple scans
      await Promise.all([
        global.createTestScan(repository.id, { 
          status: 'completed',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }),
        global.createTestScan(repository.id, { 
          status: 'failed',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }),
        global.createTestScan(repository.id, { 
          status: 'completed',
          createdAt: new Date() // today
        })
      ]);

      // Query completed scans only
      const completedScans = await global.testPrisma.scan.findMany({
        where: {
          repositoryId: repository.id,
          status: 'completed'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      expect(completedScans).toHaveLength(2);
      expect(completedScans[0].createdAt.getTime()).toBeGreaterThan(
        completedScans[1].createdAt.getTime()
      );
    });
  });

  describe('Accessibility Issues Management', () => {
    let user: any;
    let repository: any;
    let scan: any;

    beforeEach(async () => {
      user = await global.createTestUser();
      repository = await global.createTestRepository(user.id);
      scan = await global.createTestScan(repository.id);
    });

    it('should create issues with full metadata', async () => {
      const issueData = {
        scanId: scan.id,
        type: 'missing_alt_text',
        severity: 'error',
        description: 'Image missing alternative text',
        element: '<img src="photo.jpg">',
        selector: 'img[src="photo.jpg"]',
        wcagCriteria: ['1.1.1'],
        code: '<img src="photo.jpg">',
        line: 42,
        column: 8,
        filePath: 'src/components/Gallery.tsx',
        metadata: {
          elementType: 'img',
          hasAltAttribute: false,
          imageSize: { width: 300, height: 200 },
          isDecorative: false
        }
      };

      const issue = await global.testPrisma.accessibilityIssue.create({
        data: issueData
      });

      expect(issue.type).toBe('missing_alt_text');
      expect(issue.wcagCriteria).toEqual(['1.1.1']);
      expect(issue.metadata).toEqual(issueData.metadata);
      expect(issue.line).toBe(42);
      expect(issue.column).toBe(8);
    });

    it('should update issue status and fixes', async () => {
      const issue = await global.createTestIssue(scan.id);

      const updatedIssue = await global.testPrisma.accessibilityIssue.update({
        where: { id: issue.id },
        data: {
          status: 'fixed',
          fixedAt: new Date(),
          fixedBy: user.id,
          fix: {
            originalCode: '<img src="photo.jpg">',
            fixedCode: '<img src="photo.jpg" alt="Product photo">',
            explanation: 'Added descriptive alt text',
            confidence: 0.95,
            provider: 'claude',
            appliedAt: new Date()
          }
        }
      });

      expect(updatedIssue.status).toBe('fixed');
      expect(updatedIssue.fixedAt).toBeInstanceOf(Date);
      expect(updatedIssue.fix.confidence).toBe(0.95);
    });

    it('should aggregate issues by type and severity', async () => {
      // Create multiple issues
      await Promise.all([
        global.createTestIssue(scan.id, { type: 'missing_alt_text', severity: 'error' }),
        global.createTestIssue(scan.id, { type: 'missing_alt_text', severity: 'error' }),
        global.createTestIssue(scan.id, { type: 'low_contrast', severity: 'error' }),
        global.createTestIssue(scan.id, { type: 'missing_label', severity: 'warning' })
      ]);

      // Query aggregated data
      const aggregation = await global.testPrisma.accessibilityIssue.groupBy({
        by: ['type', 'severity'],
        where: {
          scanId: scan.id
        },
        _count: {
          id: true
        }
      });

      expect(aggregation).toHaveLength(3);
      
      const altTextErrors = aggregation.find(
        a => a.type === 'missing_alt_text' && a.severity === 'error'
      );
      expect(altTextErrors?._count.id).toBe(2);
    });
  });

  describe('Performance and Indexing', () => {
    let user: any;
    let repository: any;

    beforeAll(async () => {
      user = await global.createTestUser();
      repository = await global.createTestRepository(user.id);
    });

    it('should efficiently query recent scans', async () => {
      // Create many scans to test performance
      const scans = [];
      for (let i = 0; i < 100; i++) {
        scans.push(
          global.createTestScan(repository.id, {
            createdAt: new Date(Date.now() - i * 60 * 60 * 1000) // Each scan 1 hour apart
          })
        );
      }
      await Promise.all(scans);

      const startTime = Date.now();
      
      // Query most recent 10 scans
      const recentScans = await global.testPrisma.scan.findMany({
        where: {
          repositoryId: repository.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      const queryTime = Date.now() - startTime;

      expect(recentScans).toHaveLength(10);
      expect(queryTime).toBeLessThan(100); // Should be fast with proper indexing
      
      // Verify ordering
      for (let i = 1; i < recentScans.length; i++) {
        expect(recentScans[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          recentScans[i].createdAt.getTime()
        );
      }
    });

    it('should efficiently search issues by type', async () => {
      const scan = await global.createTestScan(repository.id);
      
      // Create issues of different types
      const issueTypes = ['missing_alt_text', 'low_contrast', 'missing_label', 'duplicate_id'];
      const issues = [];
      
      for (let i = 0; i < 50; i++) {
        issues.push(
          global.createTestIssue(scan.id, {
            type: issueTypes[i % issueTypes.length]
          })
        );
      }
      await Promise.all(issues);

      const startTime = Date.now();
      
      // Search for specific issue type
      const altTextIssues = await global.testPrisma.accessibilityIssue.findMany({
        where: {
          scanId: scan.id,
          type: 'missing_alt_text'
        }
      });

      const queryTime = Date.now() - startTime;

      expect(altTextIssues.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(50); // Should be fast with proper indexing
      
      // Verify all results are correct type
      altTextIssues.forEach(issue => {
        expect(issue.type).toBe('missing_alt_text');
      });
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      // Attempt to create issue with non-existent scan
      await expect(
        global.testPrisma.accessibilityIssue.create({
          data: {
            scanId: 'non-existent-scan-id',
            type: 'missing_alt_text',
            severity: 'error',
            description: 'Test issue'
          }
        })
      ).rejects.toThrow();
    });

    it('should handle transaction rollbacks', async () => {
      const user = await global.createTestUser();
      const repository = await global.createTestRepository(user.id);

      // Transaction that should fail
      await expect(
        global.testPrisma.$transaction(async (tx) => {
          // Create a scan
          const scan = await tx.scan.create({
            data: {
              repositoryId: repository.id,
              status: 'in_progress'
            }
          });

          // Create an issue
          await tx.accessibilityIssue.create({
            data: {
              scanId: scan.id,
              type: 'missing_alt_text',
              severity: 'error',
              description: 'Test issue'
            }
          });

          // Force transaction failure
          throw new Error('Transaction rollback test');
        })
      ).rejects.toThrow('Transaction rollback test');

      // Verify nothing was created
      const scans = await global.testPrisma.scan.findMany({
        where: { repositoryId: repository.id }
      });
      expect(scans).toHaveLength(0);
    });

    it('should validate enum values', async () => {
      const user = await global.createTestUser();
      const repository = await global.createTestRepository(user.id);

      // Invalid scan status
      await expect(
        global.testPrisma.scan.create({
          data: {
            repositoryId: repository.id,
            status: 'invalid_status' as any
          }
        })
      ).rejects.toThrow();

      // Invalid issue severity
      const scan = await global.createTestScan(repository.id);
      await expect(
        global.testPrisma.accessibilityIssue.create({
          data: {
            scanId: scan.id,
            type: 'missing_alt_text',
            severity: 'invalid_severity' as any,
            description: 'Test issue'
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Complex Queries and Analytics', () => {
    let user: any;
    let repository: any;

    beforeEach(async () => {
      user = await global.createTestUser();
      repository = await global.createTestRepository(user.id);

      // Create test data
      const scans = await Promise.all([
        global.createTestScan(repository.id, { 
          status: 'completed',
          issuesFound: 5,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }),
        global.createTestScan(repository.id, { 
          status: 'completed',
          issuesFound: 3,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }),
        global.createTestScan(repository.id, { 
          status: 'completed',
          issuesFound: 2,
          createdAt: new Date()
        })
      ]);

      // Create issues for each scan
      for (const scan of scans) {
        for (let i = 0; i < scan.issuesFound; i++) {
          await global.createTestIssue(scan.id, {
            type: i % 2 === 0 ? 'missing_alt_text' : 'low_contrast',
            severity: i % 3 === 0 ? 'warning' : 'error'
          });
        }
      }
    });

    it('should calculate repository analytics', async () => {
      const analytics = await global.testPrisma.scan.aggregate({
        where: {
          repositoryId: repository.id,
          status: 'completed'
        },
        _count: {
          id: true
        },
        _sum: {
          issuesFound: true
        },
        _avg: {
          issuesFound: true
        }
      });

      expect(analytics._count.id).toBe(3); // 3 completed scans
      expect(analytics._sum.issuesFound).toBe(10); // 5 + 3 + 2
      expect(analytics._avg.issuesFound).toBeCloseTo(3.33, 1);
    });

    it('should get issue trends over time', async () => {
      const trends = await global.testPrisma.scan.findMany({
        where: {
          repositoryId: repository.id,
          status: 'completed'
        },
        select: {
          id: true,
          createdAt: true,
          issuesFound: true,
          accessibilityIssues: {
            select: {
              type: true,
              severity: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      expect(trends).toHaveLength(3);
      expect(trends[0].issuesFound).toBe(5);
      expect(trends[1].issuesFound).toBe(3);
      expect(trends[2].issuesFound).toBe(2);

      // Verify issues are decreasing over time (improvement trend)
      expect(trends[0].issuesFound).toBeGreaterThan(trends[1].issuesFound);
      expect(trends[1].issuesFound).toBeGreaterThan(trends[2].issuesFound);
    });

    it('should find most common issues across repository', async () => {
      const commonIssues = await global.testPrisma.accessibilityIssue.groupBy({
        by: ['type'],
        where: {
          scan: {
            repositoryId: repository.id
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      });

      expect(commonIssues.length).toBeGreaterThan(0);
      expect(commonIssues[0]._count.id).toBeGreaterThanOrEqual(
        commonIssues[commonIssues.length - 1]._count.id
      );
    });
  });

  describe('Redis Cache Integration', () => {
    it('should store and retrieve cached data', async () => {
      const testKey = 'test:cache:key';
      const testData = { message: 'Hello, Redis!', timestamp: Date.now() };

      // Store data
      await global.testRedis.setex(testKey, 60, JSON.stringify(testData));

      // Retrieve data
      const cached = await global.testRedis.get(testKey);
      const parsedData = JSON.parse(cached!);

      expect(parsedData.message).toBe(testData.message);
      expect(parsedData.timestamp).toBe(testData.timestamp);
    });

    it('should handle cache expiration', async () => {
      const testKey = 'test:expiration:key';
      const testData = 'expires soon';

      // Store with 1 second expiration
      await global.testRedis.setex(testKey, 1, testData);

      // Verify data exists
      const immediate = await global.testRedis.get(testKey);
      expect(immediate).toBe(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify data expired
      const expired = await global.testRedis.get(testKey);
      expect(expired).toBeNull();
    });

    it('should support Redis data structures', async () => {
      const listKey = 'test:list';
      const setKey = 'test:set';
      const hashKey = 'test:hash';

      // Test list operations
      await global.testRedis.rpush(listKey, 'item1', 'item2', 'item3');
      const listItems = await global.testRedis.lrange(listKey, 0, -1);
      expect(listItems).toEqual(['item1', 'item2', 'item3']);

      // Test set operations
      await global.testRedis.sadd(setKey, 'member1', 'member2', 'member1');
      const setMembers = await global.testRedis.smembers(setKey);
      expect(setMembers.sort()).toEqual(['member1', 'member2']);

      // Test hash operations
      await global.testRedis.hset(hashKey, 'field1', 'value1', 'field2', 'value2');
      const hashData = await global.testRedis.hgetall(hashKey);
      expect(hashData).toEqual({ field1: 'value1', field2: 'value2' });
    });

    it('should handle concurrent cache operations', async () => {
      const baseKey = 'test:concurrent';
      const operations = [];

      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          global.testRedis.setex(`${baseKey}:${i}`, 60, `value-${i}`)
        );
      }

      // Execute all operations concurrently
      await Promise.all(operations);

      // Verify all values were set correctly
      const retrievals = [];
      for (let i = 0; i < 10; i++) {
        retrievals.push(global.testRedis.get(`${baseKey}:${i}`));
      }

      const results = await Promise.all(retrievals);
      results.forEach((result, index) => {
        expect(result).toBe(`value-${index}`);
      });
    });
  });
});