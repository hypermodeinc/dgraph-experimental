import json
import threading
import time
import os

import pydgraph
import requests  # Import the requests library for HTTP requests to do GraphQL

# Check for missing URLsimport json
def filePath(fname):
    return "./testers/"+fname

def load_config(config_path=filePath('config.json')):
    with open(config_path, 'r') as config_file:
        config = json.load(config_file)
    
    numThread = config.get("numThread", 10)
    delaySec = config.get("delaySec", 1)
    isCloud = config.get("isCloud", False)

    apiKey = config.get("apiKey")
    grpcUrl = config.get("grpcUrl")
    graphQLUrl = config.get("graphQLUrl")

    if not grpcUrl:
        raise ValueError("grpcUrl is missing in the configuration.")

    if isCloud and not apiKey:
        raise ValueError("apiKey is missing in config for cloud setup.")

    return {
        'numThread': numThread,
        'delaySec': delaySec,
        'isCloud': isCloud,
        'apiKey': apiKey,
        'grpcUrl': grpcUrl,
        'graphQLUrl': graphQLUrl
    }


# Dgraph client setup
def create_client(isCloud, grpcUrl, apiKey=None):
    if isCloud:
        client_stub = pydgraph.DgraphClientStub.from_cloud(grpcUrl, apiKey)
    else:
        client_stub = pydgraph.DgraphClientStub(grpcUrl)
    client = pydgraph.DgraphClient(client_stub)
    return client


# Function to run the query
def run_query(client):
    while True:
        try:
            tik = time.time()
            print("start: ", os.popen('date').read())
            response = client.txn(read_only=True).query(query)
            tok = time.time()
            result_str = str(response.json)
            toktok = time.time()
            print(f"Query executed successfully! First chars of result: {result_str[:20]}")
            print(f"client.txt took {tok-tik:.5f} s")
            print(f"query took {toktok-tok:.5f} s")  
        except Exception as e:
            print(f"Failed to execute query. Error: {e}")
        time.sleep(delaySec)

# Function to run GraphQL query
def run_gql_query():
    while True:
        try:
            tik = time.time()
            print("start: ", os.popen('date').read())
            response = requests.post(graphQLUrl, json={'query': gql_query})
            tok=time.time()
            print(f"First chars of GraphQL result: {str(response.json())[:20]}")
            print(f"query took {tok-tik:.5f} s") 
        except Exception as e:
            print(f"Failed to execute GraphQL query. Error: {e}")
        time.sleep(delaySec)


# Load configuration from JSON file
config = load_config()
print(config)
cvars = config['numThread'], config['delaySec'], config['isCloud'], config.get('apiKey'), config['grpcUrl'], config['graphQLUrl'] 
numThread, delaySec, isCloud, apiKey, grpcUrl, graphQLUrl = cvars

# Create gRPC client
client = create_client(isCloud, grpcUrl, apiKey)

# Load queries
with open(filePath('testQuery.dql'), 'r') as query_file:       # Read DQL query from testQuery.dql file
    query = query_file.read()
    
with open(filePath('testQuery.gql'), 'r') as query_file:
    gql_query = query_file.read()
    print("dql_query=", gql_query)

# Start numThread gql and numThread GraphQL threads to run the queries
threads = []
for _ in range(numThread):
    thread = threading.Thread(target=run_query, args=(client,))
    thread.start()
    threads.append(thread)

    thread = threading.Thread(target=run_gql_query)
    thread.start()
    threads.append(thread)

gql_thread = threading.Thread(target=run_gql_query)

# Join threads (optional, if you want to wait for all threads to finish)
for thread in threads:
    thread.join()
