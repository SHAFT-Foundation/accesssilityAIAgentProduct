#!/bin/bash

# Health check script for Docker containers
# Returns 0 for healthy, 1 for unhealthy

set -e

# Configuration
HEALTH_ENDPOINT="http://localhost:3000/health"
TIMEOUT=5
MAX_RETRIES=3

# Function to check if service is responding
check_endpoint() {
    local endpoint=$1
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if curl -f -s --max-time $TIMEOUT "$endpoint" > /dev/null 2>&1; then
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            sleep 1
        fi
    done
    
    return 1
}

# Function to check process is running
check_process() {
    local process_name=$1
    if pgrep -x "$process_name" > /dev/null; then
        return 0
    fi
    return 1
}

# Function to check memory usage
check_memory() {
    local max_memory_percent=${1:-90}
    local memory_info
    
    # Get memory info from /proc/meminfo
    if [ -f /proc/meminfo ]; then
        local total_memory=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local available_memory=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        
        if [ -n "$total_memory" ] && [ -n "$available_memory" ]; then
            local used_memory=$((total_memory - available_memory))
            local memory_percent=$((used_memory * 100 / total_memory))
            
            if [ $memory_percent -gt $max_memory_percent ]; then
                echo "Memory usage too high: ${memory_percent}%"
                return 1
            fi
        fi
    fi
    
    return 0
}

# Function to check disk space
check_disk_space() {
    local max_disk_percent=${1:-90}
    local disk_usage
    
    # Check disk usage of current directory
    disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ -n "$disk_usage" ] && [ "$disk_usage" -gt $max_disk_percent ]; then
        echo "Disk usage too high: ${disk_usage}%"
        return 1
    fi
    
    return 0
}

# Main health check function
main() {
    local exit_code=0
    
    echo "Starting health check..."
    
    # Check if the main process is running
    if ! check_process "node"; then
        echo "ERROR: Node process not running"
        exit_code=1
    else
        echo "✓ Node process is running"
    fi
    
    # Check HTTP endpoint
    if ! check_endpoint "$HEALTH_ENDPOINT"; then
        echo "ERROR: Health endpoint not responding"
        exit_code=1
    else
        echo "✓ Health endpoint responding"
    fi
    
    # Check memory usage
    if ! check_memory 90; then
        echo "WARNING: High memory usage detected"
        # Don't fail on memory warning, just log it
    else
        echo "✓ Memory usage normal"
    fi
    
    # Check disk space
    if ! check_disk_space 90; then
        echo "WARNING: High disk usage detected"
        # Don't fail on disk warning, just log it
    else
        echo "✓ Disk space normal"
    fi
    
    # Service-specific checks based on environment
    case "${SERVICE_NAME:-api}" in
        "api")
            # Check database connectivity through health endpoint
            if ! curl -f -s --max-time $TIMEOUT "${HEALTH_ENDPOINT}/detailed" | grep -q '"database":"healthy"'; then
                echo "WARNING: Database connectivity issue"
                # Don't fail immediately, API might still be functional
            else
                echo "✓ Database connectivity healthy"
            fi
            ;;
        "worker")
            # Check if worker is processing jobs
            if [ -f "/app/tmp/worker.pid" ]; then
                echo "✓ Worker process active"
            else
                echo "WARNING: Worker process status unknown"
            fi
            ;;
        "web")
            # Check if web app is serving static assets
            if curl -f -s --max-time $TIMEOUT "http://localhost:3000/_next/static" > /dev/null 2>&1; then
                echo "✓ Static assets serving"
            else
                echo "WARNING: Static assets not accessible"
            fi
            ;;
    esac
    
    if [ $exit_code -eq 0 ]; then
        echo "Health check passed"
    else
        echo "Health check failed"
    fi
    
    exit $exit_code
}

# Run the health check
main "$@"