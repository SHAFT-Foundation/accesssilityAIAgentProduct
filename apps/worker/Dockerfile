# Multi-stage Docker build for security and efficiency
FROM node:18-alpine AS base

# Install dependencies needed for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S scanner && \
    adduser -S scanner -u 1001 -G scanner

# Set Chrome executable path
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    npm_config_cache=/tmp/.npm

# Build stage
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM base AS production

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Change ownership to scanner user
RUN chown -R scanner:scanner /app

# Switch to non-root user
USER scanner

# Security: Remove unnecessary packages and set read-only filesystem
# (This would be done in production with additional security measures)

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Expose port
EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]