# Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Methods](#deployment-methods)
4. [Configuration](#configuration)
5. [Scaling](#scaling)
6. [Monitoring](#monitoring)
7. [Backup & Recovery](#backup--recovery)
8. [Security](#security)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Hardware Requirements

**Minimum Production Setup:**
- **CPU**: 4 cores per service instance
- **Memory**: 8GB RAM per service instance  
- **Storage**: 100GB SSD for logs and temporary files
- **Network**: 1Gbps bandwidth

**Recommended Production Setup:**
- **CPU**: 8+ cores per service instance
- **Memory**: 16GB+ RAM per service instance
- **Storage**: 500GB+ SSD with backup storage
- **Network**: 10Gbps bandwidth
- **Load Balancer**: HTTP/HTTPS load balancing
- **Database**: Dedicated PostgreSQL cluster
- **Cache**: Dedicated Redis cluster

### Software Dependencies

- **Docker Engine**: v20.10+
- **Docker Compose**: v2.0+
- **Kubernetes**: v1.24+ (for K8s deployment)
- **NGINX**: v1.20+ (for reverse proxy)
- **PostgreSQL**: v14+
- **Redis**: v7+

### External Services

- **GitHub App**: For repository integration
- **OpenAI API**: For AI-powered analysis
- **Anthropic API**: For AI-powered analysis
- **Monitoring Stack**: Prometheus, Grafana, Jaeger
- **Alerting**: PagerDuty, Slack integration

## Environment Setup

### 1. Environment Variables

Create a `.env.production` file:

```bash
# Application
NODE_ENV=production
SERVICE_NAME=accessibility-scanner
SERVICE_VERSION=1.0.0
PORT=3000
METRICS_PORT=9090

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/accessibility_scanner
POSTGRES_DB=accessibility_scanner
POSTGRES_USER=accessibility_user
POSTGRES_PASSWORD=strong_password_here

# Redis
REDIS_URL=redis://:redis_password@redis:6379
REDIS_PASSWORD=strong_redis_password

# AI Services
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here

# GitHub Integration
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Security
JWT_SECRET=very_long_random_string_for_jwt_signing
ENCRYPTION_KEY=32_character_encryption_key_here

# Logging & Monitoring
LOG_LEVEL=info
LOG_FILE=true
LOG_JSON=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_key
GRAFANA_PASSWORD=secure_grafana_password

# Performance
WORKER_CONCURRENCY=4
AI_RATE_LIMIT_TOKENS_PER_SECOND=10
MAX_CONTAINER_MEMORY=2048m
```

### 2. SSL/TLS Certificates

Generate SSL certificates for HTTPS:

```bash
# Using Let's Encrypt (recommended)
sudo certbot certonly --nginx -d your-domain.com -d api.your-domain.com

# Or generate self-signed certificates for testing
openssl req -x509 -newkey rsa:4096 -keyout ssl/private.key -out ssl/cert.crt -days 365 -nodes
```

### 3. Network Configuration

Configure firewall rules:

```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (adjust port as needed)
sudo ufw allow 22/tcp

# Allow monitoring ports (restrict to monitoring network)
sudo ufw allow from 10.0.0.0/8 to any port 9090
sudo ufw allow from 10.0.0.0/8 to any port 3100
sudo ufw allow from 10.0.0.0/8 to any port 16686

# Enable firewall
sudo ufw enable
```

## Deployment Methods

### Option 1: Docker Compose (Recommended for Small-Medium Scale)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/accessibility-scanner.git
cd accessibility-scanner

# 2. Copy production environment
cp .env.example .env.production
# Edit .env.production with your values

# 3. Build and deploy
docker-compose -f docker-compose.production.yml up -d

# 4. Verify deployment
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs -f api
```

### Option 2: Kubernetes (Recommended for Large Scale)

```bash
# 1. Create namespace
kubectl create namespace accessibility-scanner

# 2. Create secrets
kubectl create secret generic app-secrets \
  --from-env-file=.env.production \
  -n accessibility-scanner

# 3. Deploy using Helm (if available)
helm install accessibility-scanner ./helm/accessibility-scanner \
  --namespace accessibility-scanner \
  --values helm/values.production.yaml

# 4. Or deploy using kubectl
kubectl apply -f k8s/production/ -n accessibility-scanner
```

### Option 3: Cloud-Native Deployment

#### AWS ECS with Fargate

```bash
# 1. Create ECS cluster
aws ecs create-cluster --cluster-name accessibility-scanner-prod

# 2. Register task definitions
aws ecs register-task-definition --cli-input-json file://aws/task-definition.json

# 3. Create services
aws ecs create-service --cluster accessibility-scanner-prod \
  --service-name api --task-definition accessibility-api:1 \
  --desired-count 2 --launch-type FARGATE \
  --network-configuration file://aws/network-config.json
```

#### Google Cloud Run

```bash
# 1. Build and push images
docker build -t gcr.io/PROJECT_ID/accessibility-api:latest apps/api/
docker push gcr.io/PROJECT_ID/accessibility-api:latest

# 2. Deploy services
gcloud run deploy accessibility-api \
  --image gcr.io/PROJECT_ID/accessibility-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10
```

## Configuration

### 1. Database Setup

```sql
-- Create database and user
CREATE DATABASE accessibility_scanner;
CREATE USER accessibility_user WITH ENCRYPTED PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE accessibility_scanner TO accessibility_user;

-- Enable required extensions
\c accessibility_scanner
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Run migrations
npm run migrate:prod
```

### 2. Redis Configuration

Create `config/redis.conf`:

```conf
# Security
requirepass strong_redis_password
protected-mode yes
bind 127.0.0.1 ::1

# Performance
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-keepalive 300

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

### 3. NGINX Configuration

Create `config/nginx.conf`:

```nginx
upstream api_backend {
    least_conn;
    server api:3000 max_fails=3 fail_timeout=30s;
    server api:3000 max_fails=3 fail_timeout=30s;  # Add more instances as needed
}

upstream web_backend {
    server web:3000;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Web application
    location / {
        limit_req zone=web burst=50 nodelay;
        proxy_pass http://web_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health checks
    location /health {
        access_log off;
        proxy_pass http://api_backend/health;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Scaling

### Horizontal Scaling

#### Docker Compose Scaling

```bash
# Scale API service
docker-compose -f docker-compose.production.yml up -d --scale api=3

# Scale worker service
docker-compose -f docker-compose.production.yml up -d --scale worker=5

# Monitor scaling
docker-compose -f docker-compose.production.yml ps
```

#### Kubernetes Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Vertical Scaling

Update resource limits in `docker-compose.production.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'
```

### Database Scaling

#### Read Replicas

```yaml
services:
  postgres-primary:
    image: postgres:15-alpine
    environment:
      POSTGRES_REPLICATION_MODE: master
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: replica_password
    volumes:
      - postgres-primary-data:/var/lib/postgresql/data

  postgres-replica:
    image: postgres:15-alpine
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: replica_password
      POSTGRES_MASTER_SERVICE: postgres-primary
    volumes:
      - postgres-replica-data:/var/lib/postgresql/data
```

#### Connection Pooling

```yaml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres-primary
      DATABASES_PORT: 5432
      DATABASES_USER: accessibility_user
      DATABASES_PASSWORD: strong_password
      DATABASES_DBNAME: accessibility_scanner
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 100
      DEFAULT_POOL_SIZE: 20
    ports:
      - "6432:6432"
```

## Monitoring

### 1. Prometheus Configuration

Create `config/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:9090']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'worker'
    static_configs:
      - targets: ['worker:9090']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### 2. Grafana Dashboards

Import pre-built dashboards:

- **System Overview**: Node Exporter Full dashboard (ID: 1860)
- **Application Metrics**: Custom dashboard for API/Worker metrics
- **Database Monitoring**: PostgreSQL dashboard (ID: 9628)
- **Redis Monitoring**: Redis dashboard (ID: 763)
- **Container Metrics**: Docker dashboard (ID: 893)

### 3. Alerting Rules

Create `config/prometheus/rules/alerts.yml`:

```yaml
groups:
  - name: accessibility-scanner
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90% for {{ $labels.instance }}"

      - alert: DatabaseConnectionFailure
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failure"
          description: "PostgreSQL is down for {{ $labels.instance }}"

      - alert: QueueBacklog
        expr: queue_depth > 1000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Queue backlog detected"
          description: "Queue depth is {{ $value }} items"
```

## Backup & Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="accessibility_scanner"

# Create backup directory
mkdir -p $BACKUP_DIR

# Full database backup
pg_dump -h postgres -U accessibility_user -d $DB_NAME | gzip > $BACKUP_DIR/full_backup_$DATE.sql.gz

# Incremental backup using WAL archiving
pg_receivewal -h postgres -U replication_user -D $BACKUP_DIR/wal

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/full_backup_$DATE.sql.gz"
```

### 2. Application Data Backup

```bash
#!/bin/bash
# backup-application.sh

BACKUP_DIR="/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /app/logs

# Backup configurations
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /app/config

# Backup SSL certificates
tar -czf $BACKUP_DIR/ssl_$DATE.tar.gz /app/ssl

echo "Application backup completed"
```

### 3. Recovery Procedures

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1
DB_NAME="accessibility_scanner"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

# Stop application services
docker-compose -f docker-compose.production.yml stop api worker

# Drop and recreate database
dropdb -h postgres -U postgres $DB_NAME
createdb -h postgres -U postgres $DB_NAME

# Restore from backup
gunzip -c $BACKUP_FILE | psql -h postgres -U accessibility_user -d $DB_NAME

# Run migrations to ensure schema is up to date
npm run migrate:prod

# Restart services
docker-compose -f docker-compose.production.yml start api worker

echo "Database restoration completed"
```

## Security

### 1. Network Security

```bash
# Create isolated networks
docker network create --driver bridge --internal isolated-network
docker network create --driver bridge accessibility-network

# Configure network policies (Kubernetes)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx
    ports:
    - protocol: TCP
      port: 3000
```

### 2. Secrets Management

Using Kubernetes secrets:

```bash
# Create TLS secret
kubectl create secret tls app-tls-secret \
  --cert=ssl/cert.crt \
  --key=ssl/private.key

# Create API keys secret
kubectl create secret generic api-keys \
  --from-literal=openai-key="sk-..." \
  --from-literal=anthropic-key="..."
```

Using Docker secrets:

```yaml
secrets:
  openai_api_key:
    external: true
  github_private_key:
    external: true

services:
  api:
    secrets:
      - openai_api_key
      - github_private_key
    environment:
      OPENAI_API_KEY_FILE: /run/secrets/openai_api_key
      GITHUB_PRIVATE_KEY_FILE: /run/secrets/github_private_key
```

### 3. Security Scanning

```bash
# Container vulnerability scanning
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image accessibility-scanner/api:latest

# Dependency scanning
npm audit --audit-level high
npm audit fix

# Code security scanning
docker run --rm -v "$(pwd):/src" securecodewarrior/sensei-cli scan
```

## Troubleshooting

### Common Issues

#### 1. High Memory Usage

```bash
# Check memory usage
docker stats
kubectl top pods

# Check memory leaks
docker exec -it api_container_id node --inspect=0.0.0.0:9229 app.js
# Use Chrome DevTools to profile memory

# Increase memory limits
docker-compose -f docker-compose.production.yml up -d --scale api=2
```

#### 2. Database Connection Issues

```bash
# Check database logs
docker logs postgres_container_id

# Test connectivity
docker exec -it api_container_id pg_isready -h postgres -p 5432

# Check connection pool
docker exec -it api_container_id psql -h postgres -U accessibility_user -c "SELECT * FROM pg_stat_activity;"
```

#### 3. AI Service Rate Limits

```bash
# Check rate limit status
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  "https://api.openai.com/v1/usage"

# Monitor retry attempts
docker logs worker_container_id | grep "rate.limit"

# Adjust rate limiting
export AI_RATE_LIMIT_TOKENS_PER_SECOND=5
docker-compose restart worker
```

#### 4. Container Orchestration Issues

```bash
# Check Docker daemon
sudo systemctl status docker

# Check available resources
docker system df
docker system prune -f

# Restart container orchestration
docker-compose -f docker-compose.production.yml restart worker
```

### Performance Optimization

#### 1. Database Optimization

```sql
-- Add database indexes
CREATE INDEX CONCURRENTLY idx_scans_created_at ON scans(created_at);
CREATE INDEX CONCURRENTLY idx_issues_severity ON accessibility_issues(severity);
CREATE INDEX CONCURRENTLY idx_repositories_user_id ON repositories(user_id);

-- Update statistics
ANALYZE;

-- Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

#### 2. Application Optimization

```bash
# Enable production optimizations
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable clustering
export WORKER_PROCESSES=4

# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=2048 --gc-interval=100"
```

#### 3. Caching Optimization

```bash
# Redis optimization
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 2gb

# Application caching
export CACHE_TTL=3600
export CACHE_MAX_SIZE=1000
```

### Monitoring and Debugging

#### Application Logs

```bash
# Centralized logging
docker logs -f api_container_id
docker logs -f worker_container_id

# Log aggregation
curl -X GET "http://loki:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="api"}' \
  --data-urlencode 'start=2023-01-01T00:00:00Z' \
  --data-urlencode 'end=2023-01-02T00:00:00Z'
```

#### Distributed Tracing

```bash
# View traces in Jaeger
open http://localhost:16686

# Query traces
curl "http://jaeger:16686/api/traces?service=accessibility-scanner-api&start=..."
```

#### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Service dependencies
curl http://localhost:3000/health/detailed

# Infrastructure health
curl http://prometheus:9090/api/v1/query?query=up
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] SSL certificates generated and installed
- [ ] Database migrations tested
- [ ] Backup procedures tested
- [ ] Security scanning completed
- [ ] Performance testing completed
- [ ] Monitoring dashboards configured
- [ ] Alerting rules tested

### Deployment

- [ ] Deploy in staging environment first
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Verify all services are running
- [ ] Check application functionality
- [ ] Monitor logs for errors
- [ ] Verify monitoring and alerting

### Post-Deployment

- [ ] Document any issues encountered
- [ ] Update runbooks if necessary
- [ ] Schedule backup verification
- [ ] Review performance metrics
- [ ] Plan for next deployment cycle

---

This production deployment guide provides comprehensive instructions for deploying the Accessibility Scanner in a production environment. Adjust configurations based on your specific infrastructure requirements and organizational policies.