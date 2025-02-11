#!/bin/bash

# Start Dgraph Zero
dgraph zero --telemetry "reports=false; sentry=false;" --raft "idx=1;" \
    --my=localhost:5080 --replicas=1 --logtostderr \
    --wal=/data/zero1/w  --v=2 &

# Wait for Zero to be ready
while true; do
    response=$(curl -s http://localhost:6080/health)
    if [ "$response" = "OK" ]; then
        echo "✅ Dgraph Zero is healthy"
        break
    fi
    echo "⏳ Waiting for Dgraph Zero to be healthy..."
    sleep 1
done

# Start Dgraph Alpha 1
dgraph alpha --my=localhost:7080 --zero=localhost:5080 -v=2 \
    --postings=/data/alpha1/p --wal=/data/alpha1/w  --tmp=/data/alpha1/t \
    --security "whitelist=0.0.0.0/0" \
    --telemetry "reports=false; sentry=false;" \
    --raft "idx=1;" &

# Start Dgraph Alpha 2
dgraph alpha -o 1 --my=localhost:7081 --zero=localhost:5080 -v=2 \
    --postings=/data/alpha2/p --wal=/data/alpha2/w  --tmp=/data/alpha2/t \
    --security "whitelist=0.0.0.0/0" \
    --telemetry "reports=false; sentry=false;" \
    --raft "idx=2;" &

# Start Dgraph Alpha 3
dgraph alpha -o 2 --my=localhost:7082 --zero=localhost:5080 -v=2 \
    --postings=/data/alpha3/p --wal=/data/alpha3/w  --tmp=/data/alpha3/t \
    --security whitelist=0.0.0.0/0 \
    --telemetry "reports=false; sentry=false;" \
    --raft "idx=3;" &

# Wait for Alpha1 to be ready
while true; do
    response=$(curl -s http://localhost:8080/health)
    if echo "$response" | grep -q '"status":"healthy"'; then
        echo "✅ Dgraph Alpha is healthy"
        break
    fi
    echo "⏳ Waiting for Dgraph Alpha to be healthy..."
    sleep 1
done

# Wait for GraphQL schema system to be ready
while true; do
    response=$(curl -s http://localhost:8080/probe/graphql)
    if echo "$response" | grep -q '"status":"up"'; then
        echo "✅ GraphQL schema system is ready"
        break
    fi
    echo "⏳ Waiting for GraphQL schema system to be ready..."
    echo "$response"
    sleep 1
done

# Set GraphQL schema
if ! curl -s --data-binary @/data/export/schema.graphql &>/dev/null \
    --header 'content-type: application/octet-stream' \
    http://localhost:8080/admin/schema; then
    echo "❌ Failed to set GraphQL schema"
    exit 1
else
    echo "✅ GraphQL schema set"
fi

# Wait for GraphQL Schema to be ready
while true; do
    response=$(curl -s http://localhost:8080/probe/graphql)
    if echo "$response" | grep -q '"status":"up"' && \
       echo "$response" | grep -q '"schemaUpdateCounter":[1-9]'; then
        echo "✅ GraphQL schema is ready"
        break
    fi
    echo "⏳ Waiting for GraphQL schema to be ready..."
    echo "$response"
    sleep 1
done

# Load data into Dgraph cluster
dgraph live -f /data/export/dgraph_data.json --tmp /tmp
echo "✅ Data loaded into Dgraph cluster"

cd /data/export
# Create friend relationships
python /data/export/create_friendships.py

(sleep 2 && echo -e "\n🚀 Dgraph and Jupyter Lab are ready! Navigate to http://localhost:8888/lab/tree/readme.ipynb\n") &

cd /home/jovyan/work
# Start the Jupyter Lab instance
exec jupyter lab --ContentsManager.allow_hidden=true --IdentityProvider.token='' --ServerApp.password=''
