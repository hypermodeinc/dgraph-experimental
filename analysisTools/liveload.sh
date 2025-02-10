#!/bin/bash

#### convenience script to launch live loader
#### Uses HARDCODED endpoint and token. Modify and run.

# check if the input filename parameter is provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 rdffile [schemafile]"
    exit 1
fi

# assign the input filename and optional parameter to variables
rdfFilename=$1
schemaFilename=$2

# run the command with the input file name and optional parameter if it is present
if [ -z "$schemaFilename" ]; then
    docker run -it --rm -v data:/tmp dgraph/dgraph:latest  dgraph live --slash_grpc_endpoint blue-surf-630029.grpc.us-east-1.aws.cloud.dgraph.io:443 -f /tmp/$rdfFilename  -t NTI1ZGZlYWM4ZTgzZWExY2NjODc5ODJhNzRlMTk0NWQ=
else
    docker run -it --rm -v data:/tmp dgraph/dgraph:latest  dgraph live --slash_grpc_endpoint blue-surf-630029.grpc.us-east-1.aws.cloud.dgraph.io:443 -f /tmp/$rdfFilename -s /tmp/$schemaFilename -t NTI1ZGZlYWM4ZTgzZWExY2NjODc5ODJhNzRlMTk0NWQ=

fi


