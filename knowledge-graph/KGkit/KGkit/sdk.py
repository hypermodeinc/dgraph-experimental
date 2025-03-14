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
        df = source.data_frame
        mapping = TableMapping()
        entity_mapping = TableEntityMapping(entity_name)
        entity_mapping.id_field = guess_id_field(df)
        entity_mapping.columns = df.columns.to_list()
        entity_mapping.properties = guess_properties(entity_name, df.columns.to_list())
        entity_mapping.relationships = guess_relationships(entity_name, df.columns.to_list())
        if any(entity_mapping.properties):
            template = generateTemplate(entity_name, entity_mapping)
            mapping.schema = generateSchema(entity_name, entity_mapping)
            mapping.template = template
            if mutate:
                self.__add_types_and_predicates__(mapping.schema)
                rdfmap = df_to_rdf_map(df, template)
                rdf_map_to_dgraph(rdfmap, {}, self.dgraph_client)

        else:
            mapping.error = "No unique columns found"
        mapping.entity_mappings.append(entity_mapping)
        return mapping
def extract_entities(source: DataSource) -> List[str]:
    # get all entities for columns matching the pattern "{entity_name}[._:](.*)"
    entities = []
    pattern = r"([^._:]*)[._:](.*)$"
    for column in source.data_frame.columns.to_list():
        match = re.match(pattern, column)
        if match:
            entities.append(match[1])
            break
    print(list(entities))
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
def guess_properties(entity_name: str,columns: list[str]):
    pattern = f"{entity_name}[._:](.*)"
    field = re.compile(pattern)
    prefixed_columns = [item for item in columns if field.match(item)]
    if any(prefixed_columns):
        return prefixed_columns
    else:
        return columns

# Heuristic to find the relationships from the columns names
# If a columns name start with an entity name present in the list of entities, it is considered as a relationship
def guess_relationships(entity_name,columns: list[str]):
    print(f"guess_relationships: {entity_name} in {columns}")
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
    id_field = mapping.id_field
    columns = mapping.properties
    uid = "_:{}_[{}]".format(entity,id_field)
    template = "<{}> <dgraph.type> \"{}\" .\n".format(uid,entity)
    template +=  "{} <xid> \"{}\" .\n".format(uid,uid)
    for column in columns:
        predicate = column if column.startswith(entity+".") else entity+"."+column
        template += "<{}> <{}> \"[{}]\" .\n".format(uid,predicate,column)
    for column in mapping.relationships:
        target = column.split(".")[0]
        predicate = f"{entity}.{target}"
        target_blank_uid = "<_:{}_[{}]>".format(target,column)
        template += "<{}> <{}> {} .\n".format(uid,predicate,target_blank_uid)
        template += "{} <dgraph.type> \"{}\" .\n".format(target_blank_uid,target)
    return template
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