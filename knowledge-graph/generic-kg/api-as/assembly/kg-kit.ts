import { LAB_DGRAPH } from "./dgraph-utils";
import { dgraph } from "@hypermode/modus-sdk-as";
import { JSON } from "json-as";

const connection = "dgraph";


@json 
export class GenericResult<T> {
  status: string = "Success";
  message: string = "";
  data: T | null = null;
}

@json
export class ListOf<T> {
  list: T[] = [];
}

@json
export class KGSchema {
  @alias("KGSchema.label")
  label: string = "";
  @alias("KGSchema.description")
  description: string | null = null;
  @alias("KGSchema.classes")
  classes: KGClass[] = [];
}


@json
export class Entity {
  id: string = "";
  label: string = "";
  is_a: string = ""; // reference to a KGClass id
  description: string | null = null;
  related_to: Entity | null = null;
}


export function queryEntities(): Entity[] {
  const query = `
  { list(func:has(is_a)) @normalize{
        id:xid
        label:<rdfs:label>
        description:<rdfs:comment>
        is_a { <rdfs:label> is_a:KGClass.id}

      }
  }`;
  return LAB_DGRAPH.getEntityList<Entity>(connection, query);
}

@json
export class RelatedEntity {
  is_a: string = "";
  label: string = "";
  subject: Entity = new Entity();
  description: string = "";
}


@json
export class RelationalEntity {
  is_a: string = "";
  label: string = "";
  subject: Entity = new Entity();
  object: Entity = new Entity();
  description: string = "";
}


@json
export class KGClass {
  uid: string = "";
  @alias("KGClass.id")
  id: string = "";
  @alias("KGClass.role")
  role: string = "MAIN";
  @alias("KGClass.label")
  label: string = "";
  @alias("KGClass.description")
  description: string = "";
 // isDefinedBy: KGSchema | null = null;
}

@json 
export class KGDocument {
    @alias("KGDocument.id")
    id: string = "";
    @alias("KGDocument.url")
    @omitnull()
    url: string | null = null;
    @alias("KGDocument.version")
    @omitnull()
    version: string | null = null;
    @alias("KGDocument.title")
    @omitnull()
    title: string | null = null;
    @alias("KGDocument.text")
    @omitnull()
    text: string = "";
}

@json
class Relationship {
  domain: string[] = [];
  range: string[] = [];
  label: string = "";
  description: string = "";
}

export function getKGSchemas(names: string[] | null): KGSchema[] {
  let func = `has(KGSchema.label)`
  if (names !== null) {
     func = `eq(KGSchema.label,${JSON.stringify(names)})`
  }

  const statement = `query GetKGSchema() {
      list(func:${func}) {
          KGSchema.label
          KGSchema.description
          KGSchema.classes {
              KGClass.id
              KGClass.role
              KGClass.description
              KGClass.label
          }
      }
    }`;
  const query = new dgraph.Query(statement);
  const response = dgraph.executeQuery(connection, query);
  const data = JSON.parse<ListOf<KGSchema>>(response.Json);
  return data.list;
}
export function deleteKGClass(namespace: string, label: string): Map<string, string> | null {
  const id = `${namespace}/${label}`;
  const query = new dgraph.Query(`
    {
     c as var(func: eq(KGClass.id, "${id}")) {
       s as KGClass.isDefinedBy
     }
    }
   `)

 const mutation = new dgraph.Mutation().withDelNquads(
   `
   uid(c) <KGClass.id> * .
   uid(c) <dgraph.type> * .
   uid(c) <KGClass.role> * .
   uid(c) <KGClass.label> * .
   uid(c) <KGClass.description> * .
   uid(c) <KGClass.isDefinedBy> uid(s) .
   uid(s) <KGSchema.classes> uid(c) .
   `).withCondition("@if(eq(len(c), 1))");

 const response = dgraph.executeQuery(connection, query, mutation);
 return response.Uids;

  
}


export function getKGClasses(): KGClass[] {
  const statement = `
    {
    list(func:has(KGClass.label)) {
        KGClass.id
        KGClass.role
        KGClass.label
        KGClass.description
    }
}
`;

  const response = dgraph.executeQuery(
    connection,
    new dgraph.Query(statement),
  );
  const data = JSON.parse<ListOf<KGClass>>(response.Json);
  return data.list;
}

@json
export class AddKGClassInput {
  label: string = "";
  role: string = "";
  description: string = "";
}
export function addKGClass(namespace: string,classes: AddKGClassInput[]): Map<string, string> | null{
  // const ontology = getOntologyByName(namespace);
  let query_statement = `
     {
      s as var(func: eq(KGSchema.label, "${namespace}"))
    `
  let nquads = ``;
  for (let i = 0; i < classes.length; i++) {
    const id = `${namespace}/${classes[i].label}`;
    query_statement += `
      c${i} as var(func: eq(KGClass.id, "${id}"))
    `;
     nquads += `
    uid(c${i}) <KGClass.id> "${id}" .
    uid(c${i}) <dgraph.type> "KGClass" .
    uid(c${i}) <KGClass.role> "${classes[i].role}" .
    uid(c${i}) <KGClass.label> "${classes[i].label}" .
    uid(c${i}) <KGClass.description> "${classes[i].description}" .
    uid(c${i}) <KGClass.isDefinedBy> uid(s) .
    uid(s) <KGSchema.classes> uid(c${i}) .
    `
  }
  
  const response = dgraph.executeQuery(connection, new dgraph.Query(query_statement), new dgraph.Mutation().withSetNquads(nquads).withCondition("@if(eq(len(s), 1))"));
  return response.Uids;
}

export function addKGSchema(namespace: string, description:string, classes: AddKGClassInput[] | null): KGSchema{

  const kg_obj = new KGSchema();
  kg_obj.label = namespace;
  kg_obj.description = description;
  const query = new dgraph.Query(`
     {
      s as var(func: eq(KGSchema.label, "${namespace}"))
     }
    `)

  const mutation = new dgraph.Mutation().withSetNquads(
    `
    uid(s) <KGSchema.label> "${namespace}" .
    uid(s) <dgraph.type> "KGSchema" .
    uid(s) <KGSchema.description> "${description}" .

    `);

  dgraph.executeQuery(connection, query, mutation);
  if (classes !== null) {
    addKGClass(namespace, classes);
  }
  return getKGSchemas([namespace])[0];

}



export function addRelatedEntities(
  namespace: string,
  entities: RelatedEntity[],
): string {
  for (let i = 0; i < entities.length; i++) {
    addRelatedEntity(namespace, entities[i]);
  }
  return "Success";
}

export function addRelatedEntity(
  namespace: string,
  entity: RelatedEntity,
): string {
  // add entity using DQL
  const xid = `${entity.subject.is_a}:${entity.subject.label}`;
  const query = new dgraph.Query(`
      {
          source as var(func: eq(xid, "${xid}"))
      }
      `);
  var nquads = `
      <_:e> <entity.type> "${entity.is_a}" .
      <_:e> <subject> uid(source) .
      <_:e> <rdfs:comment> "${entity.description}" .
      `;
  const mutation = new dgraph.Mutation(
    "",
    "",
    nquads,
    "",
    "@if(eq(len(source), 1))",
  );
  console.log(`Mutation: ${nquads}`);
  const response = dgraph.execute(
    connection,
    new dgraph.Request(query, [mutation]),
  );
  return response.Json;
}

export function addRelationalEntities(
  namespace: string,
  entities: RelationalEntity[],
): string {
  for (let i = 0; i < entities.length; i++) {
    addRelationalEntity(namespace, entities[i]);
  }
  return "Success";
}

export function addRelationalEntity(
  namespace: string,
  entity: RelationalEntity,
): string {
  // add entity using DQL
  // assuming we can uniquelty identify a relational entity using the subject, object and the relationship:
  // unique identifier xid is
  // subject.is_a:subject.label-object.is_a-object.is_a:label
  // E.g Person:Galileo Galilei-GeospatialBody:Ganymede-AgenticEvent:discover

  const xid = `${entity.subject.is_a}:${entity.subject.label}-${entity.object.is_a}:${entity.object.label}-${entity.is_a}:${entity.label}`;
  const source_xid = `${entity.subject.is_a}:${entity.subject.label}`;
  const target_xid = `${entity.object.is_a}:${entity.object.label}`;

  const query = new dgraph.Query(`
        {
            xid as var(func: eq(xid, "${xid}"))
            source as var(func: eq(xid, "${source_xid}"))
            target as var(func: eq(xid, "${target_xid}"))
        }
        `);
  var nquads = `
        uid(xid) <entity.type> "${entity.is_a}" .
        uid(xid) <xid> "${xid}" .
        uid(xid) <subject> uid(source) .
        uid(xid) <object> uid(target) .
        uid(xid) <rdfs:label> "${entity.label}" .
        uid(xid) <rdfs:comment> "${entity.description}" .
        `;
  const mutation = new dgraph.Mutation(
    "",
    "",
    nquads,
    "",
    "@if(eq(len(source), 1) AND eq(len(target), 1))",
  );
  console.log(`Mutation: ${nquads}`);
  const response = dgraph.execute(
    connection,
    new dgraph.Request(query, [mutation]),
  );
  return response.Json;
}


export function addEntities(entities: Entity[],docid: string | null): string {
  for (let i = 0; i < entities.length; i++) {
    addEntity(entities[i], docid);
  }
  return "Success";
}
export function addEntity( entity: Entity, docid: string | null): string {
  // add entity using DQL
  const xid = `${entity.is_a}#${entity.label}`;
  let d_val = "";
  let d_rel = "";
  if (docid !== null) {
    d_val = `d as var(func: eq(KGDocument.id,"${docid}"))`
    d_rel = `
    uid(v) <found_in> uid(d) .
    uid(d) <KGDocument.id> "${docid}" .
    uid(d) <dgraph.type> "KGDocument" .
    `
  }
  const query = new dgraph.Query(`
    {
        v as var(func: eq(xid, "${xid}"))
        c as var(func: eq(KGClass.id,"${entity.is_a}"))
        ${d_val}
    }
    `);
  var nquads = `
    uid(v) <xid> "${xid}" .
    uid(v) <rdfs:label> "${entity.label}" .
    uid(v) <is_a> uid(c) .
    ${d_rel}
    `;
  if (entity.description) {
    nquads += `uid(v) <rdfs:comment> "${entity.description!}" .`;
  }
  const mutation = new dgraph.Mutation(
    "",
    "",
    nquads,
    "",
    "@if(eq(len(c), 1))",
  );
  console.log(`Mutation: ${nquads}`);
  const response = dgraph.execute(
    connection,
    new dgraph.Request(query, [mutation]),
  );
  return response.Json;
}