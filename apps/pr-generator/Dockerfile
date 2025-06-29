# Multi-stage Docker build for secure PR generation
FROM node:18-alpine AS base

# Install git and other necessary tools
RUN apk add --no-cache \
    git \
    openssh-client \
    ca-certificates \
    curl \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S prgen && \
    adduser -S prgen -u 1001 -G prgen

# Set up workspace
WORKDIR /workspace
RUN chown -R prgen:prgen /workspace

# Build stage
FROM base AS builder

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production

# Copy built dependencies
COPY --from=builder /node_modules ./node_modules

# Copy PR generation scripts
COPY scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh

# Change ownership to non-root user
RUN chown -R prgen:prgen /workspace

# Switch to non-root user
USER prgen

# Configure git for the bot user
RUN git config --global user.name "AI Accessibility Bot" && \
    git config --global user.email "accessibility-bot@example.com" && \
    git config --global init.defaultBranch main

# Security: Set read-only filesystem (except workspace)
# This would be configured by the container manager

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD echo "Container healthy"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default command (will be overridden by container manager)
CMD ["sh", "-c", "sleep infinity"]