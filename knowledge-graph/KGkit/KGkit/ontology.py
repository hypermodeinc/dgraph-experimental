from dataclasses import dataclass, field
from graphql import parse,build_schema, GraphQLObjectType,GraphQLField, GraphQLString,GraphQLSchema, print_schema
from typing import List, Optional, Dict, Any
import json
import pydgraph
from .types import KGClass, KGSchema

connection = "dgraph"

@dataclass
class GenericResult:
    status: str = "Success"
    message: str = ""
    data: Optional[Any] = None

@dataclass
class ListOf:
    list: List[Any] = field(default_factory=list)



@dataclass
class Entity:
    id: str = ""
    label: str = ""
    is_a: str = ""  # reference to a KGClass id
    description: Optional[str] = None
    related_to: Optional['Entity'] = None

def query_entities(client:pydgraph.DgraphClient,) -> List[Entity]:
    query = """
    {
      list(func: has(is_a)) @normalize {
        id: xid
        label: <rdfs:label>
        description: <rdfs:comment>
        is_a { <rdfs:label> is_a: KGClass.id }
      }
    }
    """
    txn = client.txn(readOnly=True)
    res = txn.query(query)
    entities = json.loads(res.json)['list']
    return [Entity(**entity) for entity in entities]

@dataclass
class RelatedEntity:
    is_a: str = ""
    label: str = ""
    subject: Entity = field(default_factory=Entity)
    description: str = ""

@dataclass
class RelationalEntity:
    is_a: str = ""
    label: str = ""
    subject: Entity = field(default_factory=Entity)
    object: Entity = field(default_factory=Entity)
    description: str = ""



@dataclass
class KGDocument:
    id: str = ""
    url: Optional[str] = None
    version: Optional[str] = None
    title: Optional[str] = None
    text: str = ""

@dataclass
class Relationship:
    domain: List[str] = field(default_factory=list)
    range: List[str] = field(default_factory=list)
    label: str = ""
    description: str = ""

def get_kg_schemas(client:pydgraph.DgraphClient,names: Optional[List[str]]) -> List[KGSchema]:
    func = 'has(KGSchema.label)' if names is None else f'eq(KGSchema.label, {json.dumps(names)})'
    statement = f"""
    query GetKGSchema() {{
      list(func: {func}) {{
        label:KGSchema.label
        description:KGSchema.description
        classes:KGSchema.classes {{
          id:KGClass.id
          role:KGClass.role
          description:KGClass.description
          label:KGClass.label
        }}
      }}
    }}
    """
    txn = client.txn(read_only=True)
    res = txn.query(statement)
    data = json.loads(res.json)
    return [KGSchema(**schema) for schema in data['list']]

def delete_kg_class(client:pydgraph.DgraphClient,namespace: str, label: str) -> Optional[Dict[str, str]]:
    id = f"{namespace}/{label}"
    query = f"""
    {{
      c as var(func: eq(KGClass.id, "{id}")) {{
        s as KGClass.isDefinedBy
      }}
    }}
    """
    mutation = pydgraph.Mutation(del_nquads="""
    uid(c) <KGClass.id> * .
    uid(c) <dgraph.type> * .
    uid(c) <KGClass.role> * .
    uid(c) <KGClass.label> * .
    uid(c) <KGClass.description> * .
    uid(c) <KGClass.isDefinedBy> uid(s) .
    uid(s) <KGSchema.classes> uid(c) .
    """)
    txn = client.txn()
    res = txn.mutate(mutation=mutation)
    return res.uids

def get_kg_classes(client:pydgraph.DgraphClient) -> List[KGClass]:
    statement = """
    {
      list(func: has(KGClass.label)) {
        KGClass.id
        KGClass.role
        KGClass.label
        KGClass.description
      }
    }
    """
    txn = client.txn()
    res = txn.query(statement)
    data = json.loads(res.json)
    return [KGClass(**kg_class) for kg_class in data['list']]

@dataclass
class AddKGClassInput:
    label: str = ""
    role: str = ""
    description: str = ""

def add_kg_class(client:pydgraph.DgraphClient,namespace: str, classes: List[AddKGClassInput]) -> Optional[Dict[str, str]]:
    query_statement = f"""
    {{
      s as var(func: eq(KGSchema.label, "{namespace}"))
    """
    nquads = ""
    for i, cls in enumerate(classes):
        id = f"{namespace}/{cls.label}"
        query_statement += f"""
          c{i} as var(func: eq(KGClass.id, "{id}"))
        """
        nquads += f"""
        uid(c{i}) <KGClass.id> "{id}" .
        uid(c{i}) <dgraph.type> "KGClass" .
        uid(c{i}) <KGClass.role> "{cls.role}" .
        uid(c{i}) <KGClass.label> "{cls.label}" .
        uid(c{i}) <KGClass.description> "{cls.description}" .
        uid(c{i}) <KGClass.isDefinedBy> uid(s) .
        uid(s) <KGSchema.classes> uid(c{i}) .
        """
    query_statement += "}"
    mutation = pydgraph.Mutation(set_nquads=nquads)
    txn = client.txn()
    res = txn.mutate(mutation=mutation)
    return res.uids


def add_related_entities(client:pydgraph.DgraphClient,namespace: str, entities: List[RelatedEntity]) -> str:
    for entity in entities:
        add_related_entity(client, namespace, entity)
    return "Success"

def add_related_entity(client:pydgraph.DgraphClient,namespace: str, entity: RelatedEntity) -> str:
    xid = f"{entity.subject.is_a}:{entity.subject.label}"
    query = f"""
    {{
      source as var(func: eq(xid, "{xid}"))
    }}
    """
    nquads = f"""
    <_:e> <entity.type> "{entity.is_a}" .
    <_:e> <subject> uid(source) .
    <_:e> <rdfs:comment> "{entity.description}" .
    """
    mutation = pydgraph.Mutation(set_nquads=nquads)

    txn = client.txn()
    res = txn.mutate(mutation=mutation)
    return res.json

def add_relational_entities(client:pydgraph.DgraphClient,namespace: str, entities: List[RelationalEntity]) -> str:
    for entity in entities:
        add_relational_entity(client, namespace, entity)
    return "Success"

def add_relational_entity(client:pydgraph.DgraphClient,namespace: str, entity: RelationalEntity) -> str:
    xid = f"{entity.subject.is_a}:{entity.subject.label}-{entity.object.is_a}:{entity.object.label}-{entity.is_a}:{entity.label}"
    source_xid = f"{entity.subject.is_a}:{entity.subject.label}"
    target_xid = f"{entity.object.is_a}:{entity.object.label}"
    query = f"""
    {{
      xid as var(func: eq(xid, "{xid}"))
      source as var(func: eq(xid, "{source_xid}"))
      target as var(func: eq(xid, "{target_xid}"))
    }}
    """
    nquads = f"""
    uid(xid) <entity.type> "{entity.is_a}" .
    uid(xid) <xid> "{xid}" .
    uid(xid) <subject> uid(source) .
    uid(xid) <object> uid(target) .
    uid(xid) <rdfs:label> "{entity.label}" .
    uid(xid) <rdfs:comment> "{entity.description}" .
    """
    mutation = pydgraph.Mutation(set_nquads=nquads)
    txn = client.txn()
    res = txn.mutate(mutation=mutation)
    return res.json

def add_entities(client:pydgraph.DgraphClient,entities: List[Entity], docid: Optional[str]) -> str:
    for entity in entities:
        add_entity(client,entity, docid)
    return "Success"

def add_entity(client:pydgraph.DgraphClient,entity: Entity, docid: Optional[str]) -> str:
    xid = f"{entity.is_a}#{entity.label}"
    d_val = ""
    d_rel = ""
    if docid is not None:
        d_val = f'd as var(func: eq(KGDocument.id, "{docid}"))'
        d_rel = f"""
        uid(v) <found_in> uid(d) .
        uid(d) <KGDocument.id> "{docid}" .
        uid(d) <dgraph.type> "KGDocument" .
        """
    query = f"""
    {{
      v as var(func: eq(xid, "{xid}"))
      c as var(func: eq(KGClass.id, "{entity.is_a}"))
      {d_val}
    }}
    """
    nquads = f"""
    uid(v) <xid> "{xid}" .
    uid(v) <rdfs:label> "{entity.label}" .
    uid(v) <is_a> uid(c) .
    {d_rel}
    """
    if entity.description:
        nquads += f'uid(v) <rdfs:comment> "{entity.description}" .'
    mutation = pydgraph.Mutation(set_nquads=nquads)
    txn = client.txn()
    res = txn.mutate(mutation=mutation)
    return res.jsons