import random, string
from common.setup import setup_test_suite

def get_test_data():
    test_data = setup_test_suite()
    return test_data

def randomize(a, b=0):
    if all(isinstance(element, str) for element in a):
        return random.randint(b, len(a) - 1)
    else: 
        return random.randint(b, a - 1)

def random_generate(int):
    return ''.join(random.choice(string.ascii_letters) for i in range(int))

def random_range(x, y):
    return random.randint(x, y)

class Headers:
    def get_gql_headers():
        headers = {
            "Content-Type": "application/json"
        }
        return headers

    def get_acl_headers(accessJwt):
        headers = {
            "Content-Type": "application/json",
            "X-Dgraph-AccessToken": str(accessJwt)
        }
        return headers
        
    def get_dql_headers():
        headers = {
            "Content-Type": "application/dql"
        }
        return headers

    def get_dql_json_headers(apikey=None):
        headers = {
            "Content-Type": "application/json",
            "Dg-Auth": str(apikey)
        }
        return headers

    def get_dql_auth_headers(accessJwt):
        headers = {
            "Content-Type": "application/dql",
            "X-Dgraph-AccessToken": str(accessJwt)
        }
        return headers

    def get_rdf_headers():
        headers = {
            "Content-Type": "application/rdf"
        }
        return headers

    def get_rdf_headers_auth(accessJwt):
        headers = {
            "Content-Type": "application/rdf",
            "X-Dgraph-AccessToken": str(accessJwt)
        }
        return headers

class QueryHelpers:
    def run_gql_query(client, queryJson):
        with client.post("/graphql", queryJson, headers=Headers.get_gql_headers(), catch_response=True) as response:
            if 'errors' in response.json() and response.json()['errors'] is not None:
                print(response.json())
                response.failure("Error from dgraph: " + response.json()['errors'][0]['message'])

    def run_dql_query(client, queryJson, apikey=None):
        with client.post("/query", queryJson, headers=Headers.get_dql_json_headers(apikey), catch_response=True) as response:
            if 'errors' in response.json() and response.json()['errors'] is not None:
                print(response.json())
                response.failure("Error from dgraph: " + response.json()['errors'][0]['message'])
   
class MutationHelpers:
    def run_gql_mutation(client, mutationJson): 
        with client.post("/graphql", mutationJson, headers=Headers.get_gql_headers(), catch_response=True) as response:
            if 'errors' in response.json() and response.json()['errors'] is not None:
                    print(response.json())
                    response.failure("Error from dgraph: " + response.json()['errors'][0]['message'])

    def run_dql_upsert(client, mutationJson, apiKey=None): 
        with client.post("/mutate?commitNow=true", mutationJson, headers=Headers.get_dql_json_headers(apiKey), catch_response=True) as response:
            if 'errors' in response.json() and response.json()['errors'] is not None:
                    print(response.json())
                    response.failure("Error from dgraph: " + response.json()['errors'][0]['message'])