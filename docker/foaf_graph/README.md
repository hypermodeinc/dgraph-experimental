# Dgraph FOAF Example Graph

The FOAF Example Graph is housed in an Docker image that when run starts a three-group Dgraph cluster pre-populated with data. Also in the Docker image is an instance of Jupyter Lab. Several Notebooks in this illustrate querying with GraphQL and DQL.

## Instructions

1. Start the cluster

```
docker run --rm -p 8080:8080 -p 9080:9080 -p 8888:8888 matthewmcneely/dgraph-foaf-graph
```

2. After a minute, open this link in a browser: [http://localhost:8888/lab/tree/readme.ipynb](http://localhost:8888/lab/tree/readme.ipynb)
