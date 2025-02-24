#!/bin/bash

test_dir="tests"

echo "Running tests..."

for test_file in "$test_dir"/test*.txt; do
    # Extract the base name without extension
    base_name="${test_file%.txt}"
    expected_file="$base_name.tree"

    if [ ! -f "$expected_file" ]; then
        echo "$test_file: missing expected output file $expected_file"
        continue
    fi

    # Run the command and capture output
    output=$(antlr4-parse DQL.g4 request -tree "$test_file" 2>/dev/null)

    # Compare output with expected file
    if diff <(echo "$output") "$expected_file" >/dev/null; then
        echo "$test_file: success"
    else
        echo "$test_file: failed"
    fi
done
