#!/bin/bash

# This script exports the latest Dgraph export from a Docker container and creates a tar archive.
# The tar archive is created in the $EXPORT directory (defaults to ./export).
# The tar archive can then be used to populate a new Dgraph cluster using the companion import.bash script.
# Caveats:
# - For multi-node (group) clusters, this file will start the export but only copy exported data
#   from the $DGRAPH_ALPHA_HOST that accepted the export request. Manual `docker cp` commands will be
#   necessary to recovered exported data from the other alphas.

# Default values
DGRAPH_ALPHA_HOST=${DGRAPH_ALPHA_HOST:-"localhost"}
DGRAPH_ALPHA_PORT=${DGRAPH_ALPHA_PORT:-"8080"}
EXPORT_DIR=${EXPORT_DIR:-"./export"}
DGRAPH_CONTAINER=${DGRAPH_CONTAINER:-"foaf_dgraph_alpha"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LATEST_EXPORT_DIR=""

# Create export directory if it doesn't exist
mkdir -p "$EXPORT_DIR"

# Function to display usage information
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -h, --host     Dgraph Alpha host (default: localhost)"
    echo "  -p, --port     Dgraph Alpha port (default: 8080)"
    echo "  -d, --dir      Export directory (default: ./export)"
    echo "  -c, --container Dgraph Alpha container name (default: dgraph-alpha)"
    echo "  --help         Display this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DGRAPH_ALPHA_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DGRAPH_ALPHA_PORT="$2"
            shift 2
            ;;
        -d|--dir)
            EXPORT_DIR="$2"
            shift 2
            ;;
        -c|--container)
            DGRAPH_CONTAINER="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Function to check if curl is installed
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        echo "Error: curl is not installed. Please install curl to use this script."
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        echo "Error: docker is not installed. Please install docker to use this script."
        exit 1
    fi

    # Check if container exists and is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${DGRAPH_CONTAINER}$"; then
        echo "Error: Container '${DGRAPH_CONTAINER}' is not running."
        echo "Available containers:"
        docker ps --format '{{.Names}}'
        exit 1
    fi
}

# Function to copy and verify export
copy_and_verify_export() {
    local docker_export_dir="/dgraph/export"

    echo "Copying export from Docker volume..."
    
    # Find the latest export directory (format: dgraph.r<number>.u<number>.<number>)
    LATEST_EXPORT_DIR=$(docker exec ${DGRAPH_CONTAINER} ls -t ${docker_export_dir} | grep "^dgraph\.r[0-9]\+\.u[0-9]\+\.[0-9]\+" | head -n 1)
    
    if [ -z "$LATEST_EXPORT_DIR" ]; then
        echo "Error: No export directory found in Docker volume"
        exit 1
    fi

    echo "Found export directory: $LATEST_EXPORT_DIR"

    # Create a subdirectory for this export
    local local_export_dir="${EXPORT_DIR}/${LATEST_EXPORT_DIR}"
    mkdir -p "${local_export_dir}"

    # Copy all .gz files from the export directory
    echo "Copying export files..."
    if ! docker cp "${DGRAPH_CONTAINER}:${docker_export_dir}/${LATEST_EXPORT_DIR}/." "${local_export_dir}/"; then
        echo "Error: Failed to copy export files from Docker container"
        exit 1
    fi

    # Verify that we got some .gz files
    if ! ls "${local_export_dir}"/*.gz >/dev/null 2>&1; then
        echo "Error: No .gz files found in copied directory"
        exit 1
    fi

    # List the copied files
    echo "Successfully copied files:"
    ls -l "${local_export_dir}"/*.gz

    echo "All export files successfully copied and verified"
    echo "Location: ${local_export_dir}"
}

# Function to extract task ID from export response
extract_task_id() {
    local response="$1"
    echo "$response" | grep -o '"taskId":\s*"[^"]*"' | cut -d'"' -f4
}

# Function to check task status
check_task_status() {
    local task_id="$1"
    local export_url="http://${DGRAPH_ALPHA_HOST}:${DGRAPH_ALPHA_PORT}/admin"
    
    local response=$(curl -s -X POST "$export_url" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"query Task { task(input: { id: \\\"${task_id}\\\" }) { status } }\"
        }")
    
    echo "$response" | grep -o '"status":\s*"[^"]*"' | cut -d'"' -f4
}

# Function to create final tar archive
create_tar_archive() {
    local hostname=$(hostname)
    local archive_name="export-${hostname}-${TIMESTAMP}.tar"

    echo "Extracting GraphQL schema..."

    # Extract the GraphQL schema
    if ! curl -s -X POST "$export_url" \
        -H "Content-Type: application/json" \
        -d '{"query":"query {\n  getGQLSchema {\n    schema\n  }\n}"}' \
        | docker run --rm -i imega/jq -r -c .data.getGQLSchema.schema \
        > "${EXPORT_DIR}/${LATEST_EXPORT_DIR}/schema.graphql"; then
        echo "Error: Failed to extract GraphQL schema"
        exit 1
    fi

    echo "Creating final tar archive..."
    
    # Change to the export directory
    if [ ! -d "${EXPORT_DIR}" ]; then
        echo "Error: Export directory ${EXPORT_DIR} not found"
        exit 1
    fi
    
    echo "Changing to directory: ${EXPORT_DIR}/${LATEST_EXPORT_DIR}"
    cd "${EXPORT_DIR}/${LATEST_EXPORT_DIR}" || exit 1
    
    # Verify we have .gz files in the current directory
    if ! ls *.gz >/dev/null 2>&1; then
        echo "Error: No .gz files found in ${LATEST_EXPORT_DIR}"
        exit 1
    fi
    
    # Create tar archive of all the data gz files and the schema at root level
    if ! tar cf "../${archive_name}" *.rdf.gz schema.graphql; then
        echo "Error: Failed to create tar archive"
        exit 1
    fi
    
    echo "Successfully created archive: ${EXPORT_DIR}/${archive_name}"
    
    # Return to previous directory
    cd - > /dev/null
}

# Function to perform the export
perform_export() {
    local export_url="http://${DGRAPH_ALPHA_HOST}:${DGRAPH_ALPHA_PORT}/admin"

    echo "Starting Dgraph export..."
    echo "Export URL: $export_url"

    # Extract the GraphQL schema
    schema=$(curl -s -X POST "$export_url" \
        -H "Content-Type: application/json" \
        -d '{"query":"query {\n  getGQLSchema {\n    schema\n  }\n}"}' \
        | docker run --rm -i imega/jq -r -c .data.getGQLSchema.schema)

    # Send export mutation to Dgraph with specified destination
    response=$(curl -s -X POST "$export_url" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"mutation { export(input: { format: \\\"json\\\", destination: \\\"/dgraph/export\\\" }) { response { message code } taskId } }\"
        }")

    # Check if the export request was successful
    if [[ $? -ne 0 ]] || [[ $(echo "$response" | grep -c "\"code\":\"Success\"") -eq 0 ]]; then
        echo "Error: Failed to initiate export"
        echo "Response: $response"
        exit 1
    fi

    # Extract task ID
    task_id=$(extract_task_id "$response")
    if [ -z "$task_id" ]; then
        echo "Error: Could not extract task ID from response"
        echo "Response: $response"
        exit 1
    fi

    echo "Export initiated with task ID: $task_id"
    echo "Waiting for export to complete..."

    # Poll for task completion
    while true; do
        status=$(check_task_status "$task_id")
        
        case "$status" in
            "Success")
                echo "Export completed successfully"
                break
                ;;
            "Failed")
                echo "Export failed"
                exit 1
                ;;
            "")
                echo "Error: Could not get task status"
                exit 1
                ;;
            *)
                echo "Export in progress... (status: $status)"
                sleep 1
                ;;
        esac
    done

    # Copy and verify the export files
    copy_and_verify_export
    
    # Create final tar archive
    create_tar_archive "${EXPORT_DIR}"
}

# Main execution
check_dependencies
perform_export
