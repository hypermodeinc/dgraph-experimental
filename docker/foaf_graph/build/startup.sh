#!/bin/bash

# Start Dgraph Zero
dgraph zero --telemetry "reports=false; sentry=false;" --raft "idx=1;" \
    --my=localhost:5080 --replicas=1 --logtostderr --wal=/data/zero1/w --v=2 &

# Wait for Zero to be ready
sleep 10

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

sleep 10

# Wait for Alpha to be healthy
while true; do
    response=$(curl -s http://localhost:8080/health)
    if echo "$response" | grep -q "healthy"; then
        echo "⚠️ Dgraph Alpha is healthy"
        break
    fi
    echo "⚠️ Waiting for Dgraph Alpha to be healthy..."
    sleep 2
done

if ! curl -s --data-binary @/data/export/schema.graphql &>/dev/null \
    --header 'content-type: application/octet-stream' \
    http://localhost:8080/admin/schema; then
    echo "Error: Failed to set GraphQL schema"
    exit 1
fi

sleep 2

dgraph live -f /data/export/dgraph_data.json
cd /data/export
python /data/export/create_friendships.py
cd /home/jovyan/work

# Start Jupyter notebook
exec jupyter lab --ContentsManager.allow_hidden=true --IdentityProvider.token='' --ServerApp.password='' /home/jovyan/work/readme.ipynb
