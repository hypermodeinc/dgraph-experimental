import { LAB_DGRAPH } from "./dgraph-utils";
import { dgraph } from "@hypermode/modus-sdk-as";
import { JSON } from "json-as";

const connection = "dgraph";
@json 
export class GenericResult {
  status: string = "Success";
  message: string = "";
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
  is_a: string = ""; // reference to a class label
  description: string | null = null;
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
class Relationship {
  domain: string[] = [];
  range: string[] = [];
  label: string = "";
  description: string = "";
}

export function getKGSchemaByNames(names: string[]): KGSchema[] {
  const statement = `query GetKGSchema() {
      list(func:eq(KGSchema.label,${JSON.stringify(names)})) {
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
class addKGClassInput {
  label: string = "";
  role: string = "";
  description: string = "";
}
export function addKGClass(namespace: string,classes: addKGClassInput[]): Map<string, string> | null{
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
export function addKGSchema(namespace: string, description:string): Map<string, string> | null{

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

  const response = dgraph.executeQuery(connection, query, mutation);
  return response.Uids;
}

export function addEntities(namespace: string, entities: Entity[]): string {
  for (let i = 0; i < entities.length; i++) {
    addEntity(namespace, entities[i]);
  }
  return "Success";
}
export function addEntity(namespace: string, entity: Entity): string {
  // add entity using DQL
  const xid = `${entity.is_a}#${entity.label}`;
  const query = new dgraph.Query(`
    {
        v as var(func: eq(xid, "${xid}"))
        c as var(func: eq(<rdfs:label>,"${entity.is_a}"))
    }
    `);
  var nquads = `
    uid(v) <xid> "${xid}" .
    uid(v) <rdfs:label> "${entity.label}" .
    uid(v) <is_a> uid(c) .
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
