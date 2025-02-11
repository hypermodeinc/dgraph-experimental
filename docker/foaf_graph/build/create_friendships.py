import json
import random
from typing import List, Dict
import requests

class DgraphClient:
    def __init__(self, endpoint="http://localhost:8080"):
        self.endpoint = endpoint
        
    def query(self, query: str) -> Dict:
        response = requests.post(f"{self.endpoint}/query", json={"query": query})
        return response.json()
        
    def mutate(self, mutation: Dict) -> Dict:
        response = requests.post(f"{self.endpoint}/mutate?commitNow=true", json=mutation)
        return response.json()

def get_all_persons(client: DgraphClient) -> List[Dict]:
    query = """
    {
        persons(func: type(Person), orderasc: Person.name) {
            uid
            Person.name
            Person.age
        }
    }
    """
    result = client.query(query)
    return result['data']['persons']

def assign_friends(persons: List[Dict]) -> List[Dict]:
    # Define friendship distribution
    friendship_dist = [
        (0.20, 0),      # 20% have 0 friends
        (0.70, 1),      # 70% have 1 friend
        (0.09, (2, 5)), # 9% have 2-5 friends
        (0.01, (6, 9)), # 1% have 6-9 friends
    ]
    
    friend_assignments = []
    
    for person in persons:
        # Determine number of friends based on distribution
        rand = random.random()
        cumulative_prob = 0
        num_friends = 0
        
        for prob, friend_count in friendship_dist:
            cumulative_prob += prob
            if rand <= cumulative_prob:
                if isinstance(friend_count, tuple):
                    num_friends = random.randint(friend_count[0], friend_count[1])
                else:
                    num_friends = friend_count
                break
        
        if num_friends > 0:
            # Create a list of potential friends (excluding self)
            potential_friends = [p for p in persons if p['uid'] != person['uid']]
            # Select random friends
            selected_friends = random.sample(potential_friends, min(num_friends, len(potential_friends)))
            
            # Create friendship assignments
            for friend in selected_friends:
                friend_assignments.append({
                    "uid": person['uid'],
                    "Person.friends": [{"uid": friend['uid']}]
                })

    return friend_assignments

def main():
    # Set random seed for reproducibility
    random.seed(42)
    
    client = DgraphClient()
    
    # Get all persons from Dgraph
    persons = get_all_persons(client)
    
    # Generate friend relationships
    friend_assignments = assign_friends(persons)
    
    # Create mutation
    mutation = {
        "set": friend_assignments
    }
    
    # Save to file for manual import
    with open('friend_relationships.json', 'w') as f:
        json.dump(mutation, f, indent=2)
    
    # Print the mutation
    #print(mutation)

    try:
        response = client.mutate(mutation)
        print("Created friendships")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main() 