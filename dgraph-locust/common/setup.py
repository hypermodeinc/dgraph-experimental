import requests

backend_url = "http://localhost:8080"
querySetupTest = [
    """query {
	  queryRestaurant (first: 10000) {
	    id 
	    name
	  }
	}""",
    """query {
  queryCuisine(first:10000) {
    id
    name
  }
}""",
    """query {
  queryDish(first:10000) {
    id
    name
  }
}"""
]


def setup_test_suite():
    rest_names = []
    cuisine_names = []
    dish_names = []

    rest_ids = []
    cuisine_ids = []
    dish_ids = []

    response = requests.post(url=backend_url+"/graphql", json={'query': querySetupTest[0]},
                             headers={"Content-Type": "application/json"}).json()
    for r in response['data']['queryRestaurant']:
        rest_names.append(r['name'])
        rest_ids.append(r['id'])

    response = requests.post(url=backend_url+"/graphql", json={'query': querySetupTest[1]},
                             headers={"Content-Type": "application/json"}).json()
    for r in response['data']['queryCuisine']:
        cuisine_names.append(r['name'])
        cuisine_ids.append(r['id'])

    response = requests.post(url=backend_url+"/graphql", json={'query': querySetupTest[2]},
                             headers={"Content-Type": "application/json"}).json()
    for r in response['data']['queryDish']:
        dish_names.append(r['name'])
        dish_ids.append(r['id'])

    result = dict()
    result['rest_names'] = rest_names
    result['cuisine_names'] = cuisine_names
    result['dish_names'] = dish_names
    result['rest_ids'] = rest_ids
    result['cuisine_ids'] = cuisine_ids
    result['dish_ids'] = dish_ids
    return result
