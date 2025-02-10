from locust import TaskSet, task, tag
from common.helpers import QueryHelpers, get_test_data, randomize   
import os
import json

test_sample = get_test_data()
cuisine_names = test_sample["cuisine_names"]
dish_names = test_sample["dish_names"]
rest_names = test_sample["rest_names"]

query_file = os.path.abspath('queries.txt')

with open(query_file, 'r') as file:
    queries = file.read().split('\n\n')  # Split queries by empty lines

# queryRestaurant = queries[0]
# queryDish = queries[1]
# queryCuisine = queries[2] 

dqlQueryCuisine = queries[3]
assert 'cuisines(' in dqlQueryCuisine[:100]
dqlQueryDishes = queries[4]
assert 'dishes(' in dqlQueryDishes[:100]
dqlQueryRestaurants = queries[5]
assert 'restaurants(' in dqlQueryRestaurants[:400]

dgraph_load_api_key = os.environ.get("DGRAPH_LOAD_API_KEY")

class QueryTaskSet(TaskSet):
    
#   @tag('query_restaurant')
#   #@task
#   def query_restaurant(self):
#       query = json.dumps({"query":queries[0], "variables": {
#           "name": rest_names[randomize(rest_names)]
#       }})
#       #QueryHelpers.run_gql_query(self.client, query)
  

#   @tag('query_dish')
#   #@task
#   def query_dish(self):

#       query = json.dumps({'query':queries[1], 'variables': {
#           'name': cuisine_names[randomize(cuisine_names)],
#           'dishName': dish_names[randomize(dish_names)],
#           'restName': rest_names[randomize(rest_names)]
#       }})

#       #QueryHelpers.run_gql_query(self.client, query)
  
  # Run query to search for Cuisine
#   @tag('query_cuisine')
#   #@task
#   def query_cuisine(self):

#       query = json.dumps({'query':queries[2], 'variables': {
#           'name': cuisine_names[randomize(cuisine_names)],
#           'dishName': dish_names[randomize(dish_names)],
#           'restName': rest_names[randomize(rest_names)]
#       }})

#       #QueryHelpers.run_gql_query(self.client, query)

# Run DQL query to search for Cuisine
  @tag('query_cuisine_dql')
  @task
  def query_cuisine_dql(self):
      query = json.dumps({'query':queries[3], 'variables': {
          '$name': cuisine_names[randomize(cuisine_names)],
          '$dishName': dish_names[randomize(dish_names)],
          '$restName': rest_names[randomize(rest_names)]
      }})

      QueryHelpers.run_dql_query(self.client, query, dgraph_load_api_key)

  # DQL query to search for a dish
  @tag('query_dish_dql')
  @task
  def query_dish_dql(self):

      query = json.dumps({'query':queries[4], 'variables': {
          '$name': cuisine_names[randomize(cuisine_names)],
          '$dishName': dish_names[randomize(dish_names)],
          '$restName': rest_names[randomize(rest_names)]
      }})

      QueryHelpers.run_dql_query(self.client, query, dgraph_load_api_key)


  @tag('query_restaurant_dql')
  @task
  def query_restaurant_dql(self):
      query = json.dumps({"query":queries[5], "variables": {
          "$restName": rest_names[randomize(rest_names)]
      }})
      QueryHelpers.run_dql_query(self.client, query, dgraph_load_api_key)
