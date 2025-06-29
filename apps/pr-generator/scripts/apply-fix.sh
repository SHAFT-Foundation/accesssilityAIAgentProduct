#!/bin/bash

# apply-fix.sh - Apply accessibility fixes to repository files
# This script runs in the secure container and applies AI-generated fixes

set -euo pipefail

# Security: Ensure we're running as non-root
if [ "$(id -u)" = "0" ]; then
    echo "ERROR: Script should not run as root" >&2
    exit 1
fi

# Validate required environment variables
required_vars=("WORKSPACE_PATH" "FIX_FILE" "TARGET_FILE")
for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo "ERROR: Required environment variable $var is not set" >&2
        exit 1
    fi
done

WORKSPACE_PATH="${WORKSPACE_PATH}"
FIX_FILE="${FIX_FILE}"
TARGET_FILE="${TARGET_FILE}"

# Security: Validate paths are within workspace
if [[ ! "$TARGET_FILE" =~ ^"$WORKSPACE_PATH"/.+ ]]; then
    echo "ERROR: Target file path is outside workspace" >&2
    exit 1
fi

if [[ ! "$FIX_FILE" =~ ^"$WORKSPACE_PATH"/.+ ]]; then
    echo "ERROR: Fix file path is outside workspace" >&2
    exit 1
fi

# Validate fix file exists and is readable
if [ ! -r "$FIX_FILE" ]; then
    echo "ERROR: Fix file not found or not readable: $FIX_FILE" >&2
    exit 1
fi

# Validate target file exists and is writable
if [ ! -f "$TARGET_FILE" ]; then
    echo "ERROR: Target file not found: $TARGET_FILE" >&2
    exit 1
fi

if [ ! -w "$TARGET_FILE" ]; then
    echo "ERROR: Target file is not writable: $TARGET_FILE" >&2
    exit 1
fi

echo "Applying accessibility fix to: $TARGET_FILE"

# Read the fix data (JSON format)
if ! fix_data=$(cat "$FIX_FILE"); then
    echo "ERROR: Failed to read fix file" >&2
    exit 1
fi

# Parse fix data using jq (would need to install jq in container)
# For now, use a simple approach
original_code=$(echo "$fix_data" | grep '"originalCode":' | sed 's/.*"originalCode":\s*"\([^"]*\)".*/\1/')
fixed_code=$(echo "$fix_data" | grep '"fixedCode":' | sed 's/.*"fixedCode":\s*"\([^"]*\)".*/\1/')

if [ -z "$original_code" ] || [ -z "$fixed_code" ]; then
    echo "ERROR: Invalid fix data format" >&2
    exit 1
fi

# Security: Validate fix doesn't contain dangerous patterns
dangerous_patterns=(
    "eval("
    "exec("
    "system("
    "shell_exec("
    "passthru("
    "<?php"
    "<script"
    "javascript:"
    "data:text/html"
    "file://"
)

for pattern in "${dangerous_patterns[@]}"; do
    if [[ "$fixed_code" =~ $pattern ]]; then
        echo "ERROR: Fix contains potentially dangerous pattern: $pattern" >&2
        exit 1
    fi
done

# Create backup of original file
backup_file="${TARGET_FILE}.backup.$(date +%s)"
if ! cp "$TARGET_FILE" "$backup_file"; then
    echo "ERROR: Failed to create backup file" >&2
    exit 1
fi

echo "Created backup: $backup_file"

# Apply the fix using sed (escape special characters)
original_escaped=$(echo "$original_code" | sed 's/[[\.*^$()+?{|]/\\&/g')
fixed_escaped=$(echo "$fixed_code" | sed 's/[[\.*^$()+?{|]/\\&/g')

if ! sed -i "s/$original_escaped/$fixed_escaped/g" "$TARGET_FILE"; then
    echo "ERROR: Failed to apply fix" >&2
    # Restore from backup
    cp "$backup_file" "$TARGET_FILE"
    rm -f "$backup_file"
    exit 1
fi

# Verify the fix was applied
if ! grep -q "$fixed_code" "$TARGET_FILE"; then
    echo "WARNING: Fix may not have been applied correctly"
    # Don't fail here, let the calling process handle validation
fi

# Clean up backup (keep for debugging in development)
if [ "${KEEP_BACKUPS:-false}" != "true" ]; then
    rm -f "$backup_file"
fi

echo "Fix applied successfully to: $TARGET_FILE"
echo "Original code: $original_code"
echo "Fixed code: $fixed_code"

exit 0