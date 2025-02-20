# dgraph-experimental

A set of tools and experimental projects for Dgraph.

## [data-import/csv-to-rdf](./data-import/csv-to-rdf/README.md)
import tools: handle any set of CSV files and produce triples in RDF format using mapping template files.

## [docker/foaf_graph](./docker/foaf_graph/README.md)
A self-contained (Docker) Friend-of-a-Friend graph comprising a three-group Dgraph cluster pre-populated with data. Also in the Docker image is an instance of Jupyter Lab. Several Notebooks illustrate querying with GraphQL and DQL.

## [docker/standalone_bulk_loader](./docker/standalone_bulk_loader/README.md)
A Docker image for learning Dgraph which automatically `bulk loads` the data and schemas present in the `import` folder on start up if no data is present (no p directory).



