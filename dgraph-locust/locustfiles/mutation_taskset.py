import random
import json
import os
from locust import TaskSet, task, tag
from common.helpers import MutationHelpers, get_test_data, randomize, random_generate, random_range

test_sample = get_test_data()
rest_ids = test_sample['rest_ids']
cuisine_ids = test_sample['cuisine_ids']
dish_ids = test_sample['dish_ids']

mutation_file = os.path.abspath('mutations.txt')

with open(mutation_file, 'r') as file:
    mutations = file.read().split('\n\n')  # Split queries by empty lines

class MutationTaskset(TaskSet):
  @tag('mutate_dish')
  @task(5)
  def mutate_dish(self):
      
      mutation = json.dumps({'query': mutations[0], 'variables': {
          'dishName': random_generate(10),
          'price': random_range(500, 5000), 
          'isVeg': random_range(0, 1) == 0,
          'restId': rest_ids[randomize(rest_ids)]
      }})

      MutationHelpers.run_gql_mutation(self.client, mutation)

  @tag('mutate_cuisine')
  @task(5)
  def mutate_cuisine(self):

      mutation = json.dumps({'query': mutations[1], 'variables': {
          'cuisineName': random_generate(10)
      }})

      MutationHelpers.run_gql_mutation(self.client, mutation)

  @tag('mutate_multilevel_restaurant')
  @task(5)
  def mutate_multilevel(self):
      mutation = json.dumps({'query': mutations[2], 'variables': {
          'lat': random.random(),
          'long': random.random(),
          'address': random_generate(10),
          'cityId': random_generate(10),
          'locality': random_generate(10),
          'countryId': random_generate(10),
          'countryname': random_generate(10),
          'restName': random_generate(10),
          'rating': random.random(),
          'costFor2': random_range(100, 500),
          'currency': random_generate(10),
          'cuisineName': random_generate(10),
          'dishName': random_generate(10),
          'dishPic': random_generate(10),
          'description': random_generate(10),
          'isVeg': random_range(0, 1) == 0,
          'dishPrice': random_range(500, 5000),
          'zipcode': random_range(100000, 999999)
      }})

      MutationHelpers.run_gql_mutation(self.client, mutation)
   