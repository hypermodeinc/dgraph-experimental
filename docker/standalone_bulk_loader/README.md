

# Learning environment
Create a docker image with Dgraph zero and alpha.
Auto bulk load the data and schemas present in the `import` folder on start up if no data is present (no p directory)

bulk load is the fastest way to do an initial load of data in Dgraph.
This docker image simplifies and speed up the time to get a Dgraph cluster up and running with data.


Build the docker learning image using 
```sh
make
```

Start an instance
```sh
docker run --name image-name -d -p "5080:5080" -p "8080:8080" -p "9080:9080" -v .:/dgraph dgraph/learning:latest
```

If a `p` directory exists, the instance will start the zero and alpha.
If the directory has no data  i.e no `p` directory, the images checks the `import` folder.
If the `import` folder contains a rdf or rdf.gz file, it will be loaded using `dgraph bulk`
Optionally place a `<basename>.schema` and/or `<basename>.graphql` file in the `import` folder with the basename of the rdf file to load a DQL and GraphQL schema.

For example to start an image with the donors data set from dgrap-io/benchmarks repository

```sh
mkdir import

curl -L -o donors.rdf.gz https://github.com/hypermodeinc/dgraph-benchmarks/blob/main/donors/donorsCA/donors-CA.rdf.gz

curl -LJO https://github.com/hypermodeinc/dgraph-benchmarks/blob/main/donors/donorsCA/donors.graphql

curl -LJO https://github.com/hypermodeinc/dgraph-benchmarks/blob/main/donors/donorsCA/donors.schema


docker run --name learning-donors -d -p "8080:8080" -p "9080:9080" -v .:/dgraph dgraph/learning:latest

```

To re-start the image with you initial data, simply stop the instance, delete the p, z, w, zw directories and restart the instance.

You can see the dgraph bulk logs in the docker image logs.


