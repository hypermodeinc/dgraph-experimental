import json
import dotenv
import os
from mistralai import Mistral
from KGkit import KG

dotenv.load_dotenv()
# Add a .env file to the root of the project with the following content:
# MISTRAL_API_KEY=YOUR_API_KEY
# DGRAPH_GRPC=YOUR_DGRAPH_GRPC_ENDPOINT
# DGRAPH_TOKEN=YOUR_DGRAPH_TOKEN

# kg=KG() for localhost:9080 dgraph instance
kg = KG(grpc_target=os.getenv("DGRAPH_GRPC"), token=os.getenv("DGRAPH_TOKEN"))\
.with_mistral("mistral-small-latest",Mistral(api_key=os.getenv("MISTRAL_API_KEY")))

# Declare a GraphQL Data model for the knowledge graph
# The schema is written in the Dgraph GraphQL schema syntax
# Include comments to describe types and the fields
# Create a schema


kg.with_kg_schema('''
                  """food produced by a food production process."""
                  type FoodProduct {
                    """Short name uniquely identifying the food product."""
                    name: String! @id
                    """ description/benefits of the food product."""
                    description: String
                    """ List of businesses that provide this food product."""
                    providers: [LocalBusiness] @hasInverse(field: products)
                  }
                  """A particular physical business or branch of an organization"""
                  type LocalBusiness {
                    """ Short name uniquely identifying the organization."""
                    name: String! @id
                    """ List of food products provided by this business."""
                    products: [FoodProduct] @hasInverse(field: providers)
                    """ contact email of the organization."""
                    contact_email: String
                    """ contact phone number of the organization."""
                    contact_phone: String
                    """ website of the organization."""
                    website: String
                   
                  }
                  """A person (alive, dead, undead, or fictional)."""
                  type Person {
                    """ complete name uniquely identifying the person."""
                    name: String! @id
                  }
                  ''')
# print(kg.get_kg_schema_str())
# read text file

with open("company_info.txt", "r") as file:
    data = file.read()
    extracted = kg.extract_entities_from_text(data, "LocalBusiness")
    print(json.dumps(extracted, indent=2))
