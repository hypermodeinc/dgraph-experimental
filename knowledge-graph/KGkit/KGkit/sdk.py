# Hypkit class to interact with Hypkit API
import pydgraph
from python_graphql_client import GraphqlClient
import requests
import grpc
import re
import json
from mistralai import Mistral
from graphql import GraphQLSchema,build_schema,print_schema,GraphQLObjectType,GraphQLScalarType,GraphQLField,GraphQLList
from typing import Optional, List, Any
from .rdf_lib import df_to_rdf_map
from .upload_csv import rdf_map_to_dgraph
from .types import  DataSource, TableEntityMapping, TableMapping

DESC_PREFIX = "KG:"
class KG(object):
    dgraph_token: Optional[str] = None
    dgraph_grpc: Optional[str] = None
    dgraph_http: Optional[str] = None
    dgraph_client: pydgraph.DgraphClient = None
    __graphql_schema__: GraphQLSchema = None
    __llm_mistral: Mistral = None
    __llm_model: str = None
    def __init__(
            self, 
            grpc_target: Optional[str] = None,
            token: Optional[str] = None
            ):
        if grpc_target is None:
            grpc_target = "localhost:9080"

        self.dgraph_grpc = grpc_target
        self.dgraph_token = token
        try:
            self._init_client()
            self.__init_schema__()
            self.__init_GraphQL_schema__()
        except Exception as e:
            raise Exception(f"Failed to connect to Dgraph server: {e}") from e
    def with_mistral(self,model:str, mistral: Mistral):
        self.__llm_mistral = mistral
        self.__llm_model = model
        return self
    def __add_types_and_predicates__(self, schema):
        op = pydgraph.Operation(schema=schema)
        return self.dgraph_client.alter(op)

    def __init_schema__(self):
        self.__add_types_and_predicates__(schema='''
        <xid>: string @index(hash) .
        ''')
    def __init_GraphQL_schema__(self):
        self.GraphQL_schema()

    def _init_client(self):
        if self.dgraph_grpc == "localhost:9080":
            self.dgraph_http = "http://localhost:8080"
        if "cloud.dgraph.io" in self.dgraph_grpc:
            base_url = self.dgraph_grpc.split(":")[0].replace(".grpc.",".")
            self.dgraph_http = "https://"+base_url
            client_stub = pydgraph.DgraphClientStub.from_cloud(self.dgraph_grpc, self.dgraph_token)
        elif "hypermode.host" in self.dgraph_grpc:
            base_url = self.dgraph_grpc.split(":")[0]
            self.dgraph_http = "https://"+base_url+"/dgraph"
            creds = grpc.ssl_channel_credentials()
            call_credentials = grpc.access_token_call_credentials(self.dgraph_token)
            composite_credentials = grpc.composite_channel_credentials(creds, call_credentials)
            client_stub = pydgraph.DgraphClientStub(self.dgraph_grpc, credentials=composite_credentials, )
        else:
            client_stub = pydgraph.DgraphClientStub(self.dgraph_grpc)
        self.dgraph_client = pydgraph.DgraphClient(client_stub)
        self.graphql_client = GraphqlClient(endpoint=self.dgraph_http)
        return self.dgraph_client
    
    def check_version(self):
        return self.dgraph_client.check_version()
    def drop_data_and_schema(self):
        op = pydgraph.Operation(drop_all=True)
        self.dgraph_client.alter(op)
        self.__init_schema__()
    # load DQL schema
    def schema(self):
        txn = self.dgraph_client.txn()
        try:
        # Run query.
            query = "schema{}"
            res = txn.query(query)

            # If not doing a mutation in the same transaction, simply use:
            # res = client.txn(read_only=True).query(query, variables=variables)

            data = json.loads(res.json)
            schema = ''
            for predicate in data['schema']:
                if  not predicate['predicate'].startswith('dgraph.'):
                    schema += '<{0}>: '.format(predicate['predicate'])
                    if ('list' in predicate):
                        schema += " [{}]".format(predicate['type'])
                    else:
                        schema += " {}".format(predicate['type'])
                    if ('tokenizer' in predicate):
                        schema += " @index({})".format(','.join(predicate['tokenizer']))
                    if ('upsert' in predicate):
                        schema += ' @upsert'
                    schema += " .\n"
            # Print results.
            return schema

        finally:
            txn.discard()
    # get GraphQL schema
    def GraphQL_schema(self) -> GraphQLSchema:
        txn = self.dgraph_client.txn(read_only=True)
        try:
        # Run query.
            query = "{ schema(func:has(dgraph.graphql.schema)) { datamodel:dgraph.graphql.schema}}"
            res = txn.query(query)
            data = json.loads(res.json)
            schema_text = None
            self.__graphql_schema__ = None
            if (len(data['schema']) > 0) and (data['schema'][0]['datamodel'] != ''):
                schema_text = (data['schema'][0]['datamodel'])
                self.__graphql_schema__ = build_schema(schema_text,assume_valid=True)
            return self.__graphql_schema__
        finally:
            txn.discard()
    # deploy GraphQL schema
    def deploy_GraphQL_schema(self,schema: str):
        # print(f"Deploying GraphQL schema: {schema}")
        url = self.dgraph_http+"/admin/schema"
        headers = {
            "Content-Type": "application/json"
        }
        if (self.dgraph_token is not None):
            headers["X-Auth-Token"] = self.dgraph_token
            headers["Authorization"] = f"Bearer {self.dgraph_token}"

        # Send the POST request
        response = requests.post(url, headers=headers, data=schema, timeout=50)
        if response.status_code != 200:
            raise Exception(f"Failed to deploy GraphQL schema on {url} - status code:{response.status_code}")
        if 'errors' in response.json():
            raise Exception(f"Failed to deploy GraphQL schema on {url} : {response.json()['errors']}")
    def load_tabular_data(self,
             sources: List[DataSource],
             mutate: Optional[bool] = True
             ) -> List[TableMapping]:
        table_mappings = []
        for source in sources:
            table_mappings.append(self.__load_entity( source, mutate))
        return table_mappings

    def __load_entity(self, source: DataSource, mutate: bool = False) -> TableMapping:
        entities = extract_entities_from_column_names(source)
        entity_name = entities[0]
        # Assuming only one main entity per data source for now
        # TODO: Handle multiple entities in one data source
        df = source.data_frame
        mapping = TableMapping()
        entity_mapping = TableEntityMapping(entity_name)
        entity_mapping.id_field = guess_id_field(df)
        entity_mapping.columns = df.columns.to_list()
        entity_mapping.properties = guess_properties(entity_name, columns=df.columns.to_list())

        entity_mapping.relationships = guess_relationships(entity_name, df.columns.to_list())
        if any(entity_mapping.properties):
            template, test = generateTemplate(entity_name, entity_mapping)
            print(test)
            mapping.schema = generateSchema(entity_name, entity_mapping)
            mapping.template = template
            if mutate:
                try:
                    self.__add_types_and_predicates__(mapping.schema)
                except Exception as e:
                    mapping.error = str(e)
                rdfmap = df_to_rdf_map(df, template)
                rdf_map_to_dgraph(rdfmap, {}, self.dgraph_client)

        else:
            mapping.error = "No unique columns found"
        mapping.entity_mappings.append(entity_mapping)
        return mapping

    def with_kg_schema(self,schema:str):
        new_types = build_schema(schema,assume_valid_sdl=True)
        ## add annotations to the schema
        for key,new_type in new_types.type_map.items():
            if isinstance(new_type, GraphQLObjectType) and not key.startswith("__"):
                new_type.description = DESC_PREFIX+new_type.description
                if self.__graphql_schema__ is not None:
                    self.__graphql_schema__.type_map[key] = new_type
        if self.__graphql_schema__ is None:
            self.__graphql_schema__ = new_types
        # schema_text = print_schema(self.__graphql_schema__)
        # schema_text must be the updated schema but the generation does not include directives
        # for the moment use the schema provided
        self.deploy_GraphQL_schema(schema)
        return self
    def get_kg_schema(self) -> GraphQLSchema:
        kg_types = self.__graphql_schema__
        # remove type from type_map with description not starting with "KG Schema: "
        if kg_types is None:
            return ""
        for type_name in list(kg_types.type_map):
            if type_name.startswith("__") \
            or not isinstance(kg_types.type_map[type_name], GraphQLObjectType) \
            or kg_types.type_map[type_name].description is None \
            or not kg_types.type_map[type_name].description.startswith(DESC_PREFIX):
                del kg_types.type_map[type_name]
        return kg_types
    def get_kg_schema_str(self) -> str:
        kg_types = self.get_kg_schema()
        return print_schema(kg_types)


    def suggest_entities(self,text: str) -> str:
        # Error if no LLM

        if (self.__llm_mistral is None):
            raise ValueError("LLM model not set. Use withMistral() or withOpenAI() to set the model")

        instruction = """
        Suggest entity concepts mentioned in the prompt.
        Reply with a JSON document with no quotes on field names, containing the list of entities types and a short semantic description using the example:

        {"entity_types": [
            {
            "type": "Abstract name",
            "description": "semantic description of the entity to help LLM matching",
            "examples": ["example found in the text", "example 2 found in the text"]
            }
            ]
        }
       Use the most abstract name that can apply.
        """

        # Create the messages for the chat completion
        messages = [
            {"role": "system", "content": instruction},
            {"role": "user", "content": text}
        ]

        params = {
            "model": self.__llm_model,
            "messages": messages,
            "response_format": {"type": "json_object"}
        }

        # Invoke the model with the input parameters
        # response = llm.ChatCompletion.create(**params)
        response = self.__llm_mistral.chat.complete(**params)

        # Extract and return the content of the first choice
        output = response.choices[0].message.content.strip()
        return output
    def get_entity_context(self, entity: str, with_nested: bool = True, level: int = 0) -> str:
        context = None
        kg_types = self.get_kg_schema()
        type = kg_types.type_map.get(entity)
        if type is not None:
            context = ""
            if level == 0:
                context+= f" - {entity} : {type.description}\n with fields:\n"
            indent = " "*(level+1)*4
            for field_name,field in type.fields.items():
                if isinstance(field.type,GraphQLScalarType) or isinstance(field.type.of_type, GraphQLScalarType ):
                    context += f"{indent} - {field_name}, {field.description}\n"
                elif with_nested:
                    nested = is_list_of_objects(field)
                    if (nested is not None):
                        context += f"{indent} - {field_name}, {field.description}\n"
                        context += f"{indent}   a list of nested objects with fields:\n"
                        context += self.get_entity_context(nested, False, level+1)
        return context

    def extract_entities_from_text(self,text:str, entity:str) -> Any:
        # Prepare instruction for the LLM
        instruction = (
            "You create knowledge base. List all entities from the user input\n"
            "Reply with a JSON document with no quotes on field names, containing the list of \n"+ self.get_entity_context(entity)
        )

        print(f"Prompt: \n{instruction}\n")
        # Create the messages for the chat completion
        messages = [
            {"role": "system", "content": instruction},
            {"role": "user", "content": text}
        ]

        params = {
            "model": self.__llm_model,
            "messages": messages,
            "response_format": {"type": "json_object"}
        }

        # Invoke the model with the input parameters
        # response = llm.ChatCompletion.create(**params)
        response = self.__llm_mistral.chat.complete(**params)

        # Extract and return the content of the first choice
        output = response.choices[0].message.content.strip()
        print("output:")
        print(output)
        json_output = json.loads(output)
        self.mutate_extracted_entities(entity, json_output)
        return json_output
    def mutate_extracted_entities(self,type_name:str, entities: Any ) -> str:
        data = entities[type_name] # the array of entities
        data_str = dict_to_js_object_notation(data)
        mutation = f"""
        mutation Add{type_name} {{
            add{type_name}(input: {data_str},
            upsert: true) {{
                numUids
            }}
        }}
        """
        print(mutation)
        # Define the headers, including the Content-Type for JSON
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {self.dgraph_token}"
        }

        # Define the payload with the query
        payload = {
            'query': mutation
        }
        print(json.dumps(payload, indent=2))

        # Send the POST request to the GraphQL endpoint
        print(f"POST {self.dgraph_http}/graphql")
        response = requests.post(self.dgraph_http+"/graphql", headers=headers, data=json.dumps(payload),timeout=10)
        print(response.text)
        print(json.dumps(response.json(), indent=2))


def is_list_of_objects(field:GraphQLField) -> str:
    field_type = field.type
    if isinstance(field_type, GraphQLList):
        inner_type = field_type.of_type
        if isinstance(inner_type, GraphQLObjectType):
            return inner_type.name
    return None
def extract_entities_from_column_names(source: DataSource) -> List[str]:
    # get all entities for columns matching the pattern "{entity_name}[._:](.*)"
    # For now just get the first entity found
    entities = []
    pattern = r"([^._:]*)[._:](.*)$"
    print(source.data_frame.columns)
    print(source.data_frame.columns.to_list())
    for column in source.data_frame.columns.to_list():
        match = re.match(pattern, column)
        if match:
            entities.append(match[1])
            break
    if not any(entities):
        entities.append("Thing")
    return list(entities)

# Heuristic to get ID field
# get first field that seems unique
def guess_id_field(df):
    df_small = df.head(100)
    unique_columns = []
    for column in df_small.columns:
        if df_small[column].dropna().is_unique:
            unique_columns.append(column)
    return unique_columns[0]

# Heuristic to get properties for the entity_name
# Get all columns prefix with <entity_name>.
# if none, get all columns
def guess_properties(entity_name: str,columns: list[str],is_main_entity = True):
    # a pattern to find field in the form of <entity_name>[._:]<something>
    pattern = r"([^._:]*)[._:](.*)"
    prefixed_field = re.compile(pattern)
    property_columns = []
    # get prefixed fields matching the entity_name and simple fields if it is the main entity
    for item in columns:
        match = prefixed_field.match(item)
        if match:
            if match[1] == entity_name:
                property_columns.append(item)
        else:
            if is_main_entity:
                property_columns.append(item)

    return property_columns if any(property_columns) else columns


# Heuristic to find the relationships from the columns names
# If a columns name start with an entity name present in the list of entities, it is considered as a relationship
def guess_relationships(entity_name: str, columns: list[str]):
    pattern = r"([^._:]*)[._:](.*)"
    field = re.compile(pattern)
    relationships = []
    for item in columns:
        match = field.match(item)
        if match and match[1] != entity_name:
            relationships.append(item)
    print(f"relationships: {relationships}")
    return relationships

def generateTemplate(entity, mapping: TableEntityMapping):
    template = {}
    id_field = mapping.id_field
    columns = mapping.properties
    uid = "_:{}_[{}]".format(entity,id_field)
    template = "<{}> <dgraph.type> \"{}\" .\n".format(uid,entity)
    template +=  "<{}> <xid> \"{}\" .\n".format(uid,uid)

    geo_loc = {}
    for column in columns:
        if (prefix_lat := guess_latitude(column)) is not None:
            if prefix_lat not in geo_loc:
                geo_loc[prefix_lat] = {}
            geo_loc[prefix_lat]['lat'] = column
        elif (prefix_long := guess_longitude(column)) is not None:
            if prefix_long not in geo_loc:
                geo_loc[prefix_long] = {}
            geo_loc[prefix_long]['long'] = column
        else:
            predicate = column if column.startswith(entity+".") else entity+"."+column
            template += "<{}> <{}> \"[{}]\" .\n".format(uid,predicate,column)
    # check geo_loc fields
    print(geo_loc)
    for prefix, fields in geo_loc.items():
        lat_field = fields.get('lat')
        long_field = fields.get('long')
        if (lat_field is not None) and (long_field is not None):
            template += "<{}> <{}.{}> \"{{'type':'Point','coordinates':[[{}],[{}]]}}\"^^<geo:geojson> .\n".format(uid,entity,prefix,lat_field,long_field)
    for column in mapping.relationships:
        target = column.split(".")[0]
        predicate = f"{entity}.{target}"
        target_blank_uid = "<_:{}_[{}]>".format(target,column)
        template += "<{}> <{}> {} .\n".format(uid,predicate,target_blank_uid)
        template += "{} <dgraph.type> \"{}\" .\n".format(target_blank_uid,target)
    return template, template
def generateSchema(entity, mapping: TableEntityMapping) -> str:
    types = ''
    predicates = ''
    types += "type {0} {{\n".format(entity)
    for column in mapping.properties:
        predicate = column if column.startswith(entity+".") else entity+"."+column
        types += "  <{0}>\n".format(predicate)
        predicates += "<{0}>: string .\n".format(predicate)
    for column in mapping.relationships:
        target = column.split(".")[0]
        predicate = f"{entity}.{target}"
        types += "  <{0}>\n".format(predicate)
        predicates += "<{0}>: uid @reverse .\n".format(predicate)
    types += "}\n"
    return predicates + types
def guess_latitude(column:str) -> str:
    for postfix in ['latitude','lat']:
        if column.lower().endswith(postfix):
            prefix = column[:-len(postfix)] if column[:-len(postfix)] != '' else 'location'
            return prefix
    return None
def guess_longitude(column:str) -> str:
    for postfix in ['longitude','long','lng']:
        if column.lower().endswith(postfix):
            prefix = column[:-len(postfix)] if column[:-len(postfix)] != '' else 'location'
            return prefix
    return None

def dict_to_js_object_notation(data: dict) -> str:
    # Remove quotes around object keys
    json_str = json.dumps(data)
    json_like_js = re.sub(r'"(\w+)"\s*:', r'\1:', json_str)
    return json_like_js
