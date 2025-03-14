# Hypkit class to interact with Hypkit API
import pydgraph
import grpc
import re
import json
from graphql import GraphQLSchema,build_schema
from typing import Optional, List
from .rdf_lib import df_to_rdf_map
from .upload_csv import rdf_map_to_dgraph

from .types import DataSource, TableEntityMapping, TableMapping

class KG(object):
    dgraph_token: Optional[str] = None
    dgraph_grpc: Optional[str] = None
    dgraph_client: any = None
    __graphql_schema__: str = None
    def __init__(
            self, 
            token: Optional[str] = None,
            grpc_target: Optional[str] = None):
        if grpc_target is None:
            grpc_target = "localhost:9080"
        self.dgraph_grpc = grpc_target
        self.dgraph_token = token
        self._init_client()
        self.__init_schema__()

    def __add_types_and_predicates__(self, schema):
        op = pydgraph.Operation(schema=schema)
        return self.dgraph_client.alter(op)

    def __init_schema__(self):
        self.__add_types_and_predicates__(schema='<xid>: string @index(hash) .')

    def _init_client(self):
        if "cloud.dgraph.io" in self.dgraph_grpc:
            client_stub = pydgraph.DgraphClientStub.from_cloud(self.dgraph_grpc, self.dgraph_token)
        elif "hypermode.host" in self.dgraph_grpc:
            creds = grpc.ssl_channel_credentials()
            call_credentials = grpc.access_token_call_credentials(self.dgraph_token)
            composite_credentials = grpc.composite_channel_credentials(creds, call_credentials)
            client_stub = pydgraph.DgraphClientStub(self.dgraph_grpc, credentials=composite_credentials, )
        else:
            client_stub = pydgraph.DgraphClientStub(self.dgraph_grpc)
        self.dgraph_client = pydgraph.DgraphClient(client_stub)
        return self.dgraph_client
    
    def check_version(self):
        return self.dgraph_client.check_version()
    def drop_data_and_schema(self):
        op = pydgraph.Operation(drop_all=True)
        self.dgraph_client.alter(op)
        self.__init_schema__()

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

    def GraphQL_schema(self) -> GraphQLSchema:
        txn = self.dgraph_client.txn()
        try:
        # Run query.
            query = "{ schema(func:has(dgraph.graphql.schema)) { datamodel:dgraph.graphql.schema}}"
            res = txn.query(query)
            data = json.loads(res.json)
            schema_text = None
            schema = None
            if (len(data['schema']) > 0) and (data['schema'][0]['datamodel'] != ''):
                schema_text = (data['schema'][0]['datamodel'])
                schema = build_schema(schema_text)
            self.__graphql_schema__ = schema_text
            return schema
        finally:
            txn.discard()

    def load(self,
             sources: List[DataSource],
             mutate: Optional[bool] = True
             ) -> List[TableMapping]:
        table_mappings = []
        for source in sources:
            table_mappings.append(self.__load_entity( source, mutate))
        return table_mappings

    def __load_entity(self, source: DataSource, mutate: bool = False) -> TableMapping:
        entities = extract_entities(source)
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
def extract_entities(source: DataSource) -> List[str]:
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
