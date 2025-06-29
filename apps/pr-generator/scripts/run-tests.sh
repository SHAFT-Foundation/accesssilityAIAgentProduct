#!/bin/bash

# run-tests.sh - Run repository tests in secure container
# This script validates that accessibility fixes don't break functionality

set -euo pipefail

# Security: Ensure we're running as non-root
if [ "$(id -u)" = "0" ]; then
    echo "ERROR: Script should not run as root" >&2
    exit 1
fi

# Validate required environment variables
required_vars=("WORKSPACE_PATH")
for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo "ERROR: Required environment variable $var is not set" >&2
        exit 1
    fi
done

WORKSPACE_PATH="${WORKSPACE_PATH}"
TEST_COMMAND="${TEST_COMMAND:-npm test}"
PACKAGE_MANAGER="${PACKAGE_MANAGER:-npm}"
INSTALL_DEPENDENCIES="${INSTALL_DEPENDENCIES:-true}"
TEST_TIMEOUT="${TEST_TIMEOUT:-300}" # 5 minutes default

# Security: Validate workspace path
if [[ ! "$WORKSPACE_PATH" =~ ^/workspace/.+ ]]; then
    echo "ERROR: Invalid workspace path" >&2
    exit 1
fi

# Change to workspace directory
if ! cd "$WORKSPACE_PATH"; then
    echo "ERROR: Failed to change to workspace directory: $WORKSPACE_PATH" >&2
    exit 1
fi

echo "Running tests in: $WORKSPACE_PATH"
echo "Test command: $TEST_COMMAND"
echo "Package manager: $PACKAGE_MANAGER"

# Install dependencies if needed
if [ "$INSTALL_DEPENDENCIES" = "true" ]; then
    echo "Installing dependencies..."
    
    case "$PACKAGE_MANAGER" in
        npm)
            if [ -f "package-lock.json" ]; then
                npm ci --production --silent
            else
                npm install --production --silent
            fi
            ;;
        yarn)
            if [ -f "yarn.lock" ]; then
                yarn install --frozen-lockfile --production --silent
            else
                yarn install --production --silent
            fi
            ;;
        pnpm)
            if [ -f "pnpm-lock.yaml" ]; then
                pnpm install --frozen-lockfile --prod --silent
            else
                pnpm install --prod --silent
            fi
            ;;
        *)
            echo "ERROR: Unsupported package manager: $PACKAGE_MANAGER" >&2
            exit 1
            ;;
    esac
    
    echo "Dependencies installed successfully"
fi

# Set up test environment
export NODE_ENV=test
export CI=true

# Create test output directory
TEST_OUTPUT_DIR="$WORKSPACE_PATH/test-results"
mkdir -p "$TEST_OUTPUT_DIR"

# Run tests with timeout
echo "Running tests..."
start_time=$(date +%s)

# Use timeout to prevent hanging tests
if timeout "$TEST_TIMEOUT" bash -c "$TEST_COMMAND" > "$TEST_OUTPUT_DIR/test.log" 2>&1; then
    test_exit_code=0
    echo "Tests passed successfully"
else
    test_exit_code=$?
    echo "Tests failed with exit code: $test_exit_code"
fi

end_time=$(date +%s)
test_duration=$((end_time - start_time))

echo "Test duration: ${test_duration}s"

# Parse test results if possible
test_summary="Unknown"
if [ -f "$TEST_OUTPUT_DIR/test.log" ]; then
    # Try to extract test summary (works for Jest, Mocha, etc.)
    if grep -q "Tests:" "$TEST_OUTPUT_DIR/test.log"; then
        test_summary=$(grep "Tests:" "$TEST_OUTPUT_DIR/test.log" | tail -1)
    elif grep -q "passing" "$TEST_OUTPUT_DIR/test.log"; then
        test_summary=$(grep -E "(passing|failing)" "$TEST_OUTPUT_DIR/test.log" | tail -1)
    fi
    
    echo "Test summary: $test_summary"
fi

# Save test metadata
cat > "$TEST_OUTPUT_DIR/metadata.json" << EOF
{
  "exitCode": $test_exit_code,
  "duration": $test_duration,
  "command": "$TEST_COMMAND",
  "packageManager": "$PACKAGE_MANAGER",
  "summary": "$test_summary",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "workspace": "$WORKSPACE_PATH"
}
EOF

# Show test output on failure
if [ $test_exit_code -ne 0 ]; then
    echo "=== Test Output ==="
    cat "$TEST_OUTPUT_DIR/test.log"
    echo "=================="
fi

# Clean up node_modules if we installed them (save space)
if [ "$INSTALL_DEPENDENCIES" = "true" ] && [ "${CLEANUP_DEPS:-true}" = "true" ]; then
    echo "Cleaning up dependencies..."
    rm -rf node_modules
fi

exit $test_exit_code