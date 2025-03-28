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
.with_mistral("mistral-large-latest",Mistral(api_key=os.getenv("MISTRAL_API_KEY")))

# Declare a Data model for the knowledge graph

data_model = KG.newDataModel()

# Define FoodProduct class
food_product = (
    KG.newObjectType("FoodProduct", comment="food produced by a food production process.")
    .withIdentifier(
        "name", "String", comment="Short name uniquely identifying the food product."
    )
    .withScalarField(
        "description", "String", comment="description/benefits of the food product."
    )
    .withRelation(
        "providers",
        "LocalBusiness",
        is_list=True,
        has_inverse="products",
        comment="List of businesses that provide this food product.",
    )
)

# Define LocalBusiness class
local_business = (
    KG.newObjectType("LocalBusiness", comment="A particular physical business or branch of an organization.")
    .withIdentifier(
        "name", "String", comment="Short name uniquely identifying the organization."
    )
    .withScalarField(
        "contact_email", "String", comment="contact email of the organization."
    )
    .withScalarField(
        "contact_phone", "String", comment="contact phone number of the organization."
    )
    .withScalarField(
        "website", "String", comment="website of the organization."
    )
    .withRelation(
        "products",
        "FoodProduct",
        is_list=True,
        has_inverse="providers",
        comment="List of food products provided by this business.",
    )
)
# Add Types to the schema
data_model = data_model.withObjectTypes([food_product, local_business])

kg.with_data_model(data_model)

# print(kg.get_kg_schema_str())
# read text file
# Open all PDF in this directoy
ENTITY_TYPE = "LocalBusiness"
for file in os.listdir():
    if file.endswith(".pdf"):
        print(f"Extracting entities \"{ENTITY_TYPE}\" from {file}")
        with open(file, "rb") as pdf_file:
            # get base64 encoded data
            data = pdf_file.read()
            result = kg.extract_entities_from_pdf(data, ENTITY_TYPE)
            if result.error:
                print(f"Error: {result.error}")
                continue
            print("Extracted entities:")
            print(json.dumps(result.json, indent=2))
            print("Prompt:")
            print(result.prompt)


