## Setup: 

Create a virtual env using `venv`, for example:

```
python3 -m venv .dgraph-locust && \ 
source .dgraph-locust/bin/activate && \ 
cd dgraph-locust  
```

Install dependencies from `requirements.txt` using `pip` :

```
pip install -r requirements.txt
```

Setup a Dgraph cluster quickly using `docker compose`:

```
docker compose up -d 
```

Upload the schema and load test data: 
```
python3 common/seed.py
```   
This test data (available in the `data` dir) was generated using the Dgraph `datagen` tool which can be downloaded [here](https://github.com/dgraph-io/dgraph/tree/main/graphql/testdata/datagen). 
Please refer the `schema.graphql` for more info on that data-model.  

## Run Tests:

Add queries and mutations to the `queries.txt` and `mutations.txt` files respectively. The files in this repo contain sample queries corresponding to the test-data, but all queries/mutations must be added to these files. 

**NOTE:** Please ensure that each query/mutation is separated by a newline which the parser relies on as a delimiter, to identify separate queries or mutations. The parsing will fail if the newlines are not added or are included within queries themselves.

### With Web-UI: 

To start the query load-tests:

```
locust -f locustfiles/query.py
```

The Locust Web UI can be accessed at http://localhost:8089.  

To start mutation load-tests:

```
locust -f locustfiles/mutation.py
```

To start a mixed-load test comprising of both queries and mutations:

```
locust -f locustfiles/mixed_load.py
```



### Without WebUI:

```
locust -f locustfiles/query.py --headless -H http://localhost:8080 -u 1000 -r 100 --run-time 3h30m
```

## Project Structure:

#### common

- The `seed.py` is used to upload the GraphQL schema and load data using the Dgraph Live Loader. 

- The `job.py` is used to setup and collect Go profiles for CPU, heap and goroutines. The files are saved in the `output` dir, within the respective sub-directories.  

- The `setup.py` file contains logic to retrieve data to be used as filter values in the queries to test.  

- The `helpers.py` contains common reusable methods for the tests. 


#### locustfiles

- Contains the locust test files that can be run as noted above.


#### output

- Contains sub-directories for storing profiling info. 