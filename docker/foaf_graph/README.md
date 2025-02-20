# Dgraph Friend-of-a-Friend Example Graph

A self-contained (Docker) Friend-of-a-Friend graph comprising a three-group Dgraph cluster
pre-populated with data. Also in the Docker image is an instance of Jupyter Lab. Several
Jupyter Notebooks illustrate querying with GraphQL and DQL.

## Instructions

1. Start the cluster

```/bin/bash
docker run --rm -p 8080:8080 -p 9080:9080 -p 8888:8888 ghcr.io/hypermodeinc/dgraph-foaf-graph:latest
```

2. After a minute, open this link in a browser: [http://localhost:8888/lab/tree/readme.ipynb](http://localhost:8888/lab/tree/readme.ipynb)


> Side Note: the [startup.sh](build/startup.sh) script that initializes the cluster is a good example of how to start and load a Dgraph cluster using the health and ready endpoints made available by zeros and alphas.
