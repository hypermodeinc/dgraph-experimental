/**
 * This file is the entry point for the assembly API.
 */
import { models } from "@hypermode/modus-sdk-as";
import { JSON } from "json-as";
import {
  OpenAIChatModel,
  ResponseFormat,
  SystemMessage,
  UserMessage,
} from "@hypermode/modus-sdk-as/models/openai/chat";

import {
  KGSchema,
  KGClass,
  Entity,
  RelatedEntity,
  RelationalEntity,
  addEntities,
  addRelatedEntities,
  addRelationalEntities,
  getKGSchemas,
  KGDocument
} from "./kg-kit";
import { extractEntities } from "./kg-kits-api";
import { LAB_DGRAPH } from "./dgraph-utils";

export { extractEntities} from "./kg-kits-api";
export { addKGSchema, addKGClass, getKGSchemas, getKGClasses , deleteKGClass, queryEntities} from "./kg-kit";
export { addHypermodeDefaultSchema, addHypermodeFoodIndustry } from "./kg-schema-default";
const MODEL_DEBUG = false;
const DEFAULT_NAMESPACE = "Hypermode/default";

export function simulateEntities(text: string): Entity[] {
  const entities = JSON.parse<Entity[]>(`
    [
            {
                "label": "Jupiter",
                "is_a": "CelestialBody",
                "description": "the fifth and largest planet in the Solar System."
            },
            {
                "label": "Sun",
                "is_a": "CelestialBody",
                "description": "the star at the center of the Solar System."
            },
            {
                "label": "Saturn",
                "is_a": "CelestialBody",
                "description": "the sixth planet from the Sun and a gas giant."
            },
            {
                "label": "Uranus",
                "is_a": "CelestialBody",
                "description": "a planet from the solar system, classified as an ice giant."
            },
            {
                "label": "Neptune",
                "is_a": "CelestialBody",
                "description": "the eighth and farthest planet from the Sun in the Solar System, classified as an ice giant."
            },
            {
                "label": "Earth",
                "is_a": "CelestialBody",
                "description": "the third planet from the Sun and the only astronomical object known to harbor life."
            },
            {
                "label": "Moon",
                "is_a": "CelestialBody",
                "description": "Earth's only natural satellite."
            },
            {
                "label": "Venus",
                "is_a": "CelestialBody",
                "description": "the second planet from the Sun, known for its brightness in the night sky."
            }
        ]
    `);
  return entities;
}
export function readEntities(entities: Entity[]): string {
  var status = "";
  status += "Entities:\n";
  for (let i = 0; i < entities.length; i++) {
    status += `  ${entities[i].label} is a ${entities[i].is_a}\n`;
  }
  return status;
}







export function extractRelatedEntities(
  text: string,
  entities: Entity[],
  namespaces: string[] | null = null,
): RelatedEntity[] {
  // if not provided get the ontology from the connected Knowledge Graph
  // extractEntities can be used in a pipeline where the ontology is already loaded
  // or to test an ontology before saving it to the Knowledge Graph
  if (namespaces == null) {
    namespaces = [DEFAULT_NAMESPACE];
  }
  const ontologies = getKGSchemas(namespaces);
  const ontology = ontologies[0];
  const model = models.getModel<OpenAIChatModel>("llm");
  model.debug = MODEL_DEBUG;
  var instruction = `User submits a text. `;
  instruction += `
  Identify the following types of information:
  `;
  for (let i = 0; i < ontology.classes.length; i++) {
    if (ontology.classes[i].role == "RELATED") {
      instruction += ` - ${ontology.classes[i].label}: ${ontology.classes[i].description}\n`;
    }
  }

  instruction += `Find only the information related to the following entities:
  LIST OF KNOWN ENTITIES:
  `;
  for (let i = 0; i < entities.length; i++) {
    instruction += `- label:${entities[i].label} is_a:${entities[i].is_a}\n`;
  }

  instruction += `Reply with a JSON document containing the list of items containing the retrieved information and the subject entity, following the example.

  {
    "list": [ {"is_a": "Fact","label":"in one word what the info is about", "subject": {"label": "Uranus", "is_a":"CelestialBody"}, "description": "The fact or characteristic"}]
  }`;

  // We'll start by creating an input object using the instruction and prompt provided.
  const input = model.createInput([
    new SystemMessage(instruction),
    new UserMessage(text),
  ]);
  // input.temperature = 0.7;
  input.responseFormat = ResponseFormat.Json;
  const output = model.invoke(input);
  const llm_response = output.choices[0].message.content.trim();
  const list = JSON.parse<LAB_DGRAPH.ListOf<RelatedEntity>>(llm_response).list;

  return list;
}

export function saveRelatedEntities(entities: RelatedEntity[]): string {
  return addRelatedEntities("rag/example", entities);
}

export function extractRelationalEntities(
  text: string,
  entities: Entity[],
  namespaces: string[] | null = null,
): RelationalEntity[] {
  // if not provided get the ontology from the connected Knowledge Graph
  // extractEntities can be used in a pipeline where the ontology is already loaded
  // or to test an ontology before saving it to the Knowledge Graph
  if (namespaces == null) {
    namespaces = [DEFAULT_NAMESPACE];
  }
  const ontology = getKGSchemas(namespaces)[0];
  const model = models.getModel<OpenAIChatModel>("llm");
  model.debug = MODEL_DEBUG;
  var instruction = `User submits a text. `;
  instruction += `
  Identify the following types of information:
  `;
  for (let i = 0; i < ontology.classes.length; i++) {
    if (ontology.classes[i].role == "RELATION") {
      instruction += ` - ${ontology.classes[i].label}: ${ontology.classes[i].description}\n`;
    }
  }
  instruction += `Find only the information involving the following entities as subject or object.
  LIST OF KNOWN ENTITIES:
  `;
  for (let i = 0; i < entities.length; i++) {
    instruction += `- label:${entities[i].label} is_a:${entities[i].is_a}\n`;
  }

  instruction += `Use a verb as label and a sentence to descrbe the event.
  Reply with a JSON document containing the list of information with the entity source using the following example.

  {
    "list": [ {"is_a": "AgenticEvent","label":"discover", "subject": {"label": "Galileo", "is_a":"Person"}, "object": {"label": "Uranus", "is_a":"CelestialBody"}, "description": "A sentence description what happened"}]
  }`;

  // We'll start by creating an input object using the instruction and prompt provided.
  const input = model.createInput([
    new SystemMessage(instruction),
    new UserMessage(text),
  ]);
  // input.temperature = 0.7;
  input.responseFormat = ResponseFormat.Json;
  const output = model.invoke(input);
  const llm_response = output.choices[0].message.content.trim();
  const list =
    JSON.parse<LAB_DGRAPH.ListOf<RelationalEntity>>(llm_response).list;

  return list;
}

export function saveRelationalEntities(entities: RelationalEntity[]): string {
  return addRelationalEntities("rag/example", entities);
}
export function analyzeRelationships(text: string): string {
  // The imported OpenAIChatModel interface follows the OpenAI chat completion model input format.
  const model = models.getModel<OpenAIChatModel>("llm");
  const instruction = `List event and facts mentioned in the prompt. 
  AgentiveEvent: an event involving an agent that has occurred in the past and is now considered an established fact
  Fact: something we know to be true about an entity.


  
  Reply with a JSON document containing the list of entities with an identifier name and a short semantic description using the example:
  ["entities": [{"source": "name of the agent", "type": "AgentiveEvent", "description": "what happened"},
  {"source": "name of the entity", "type": "Fact", "description": "the fact."}]`;

  // We'll start by creating an input object using the instruction and prompt provided.
  const input = model.createInput([
    new SystemMessage(instruction),
    new UserMessage(text),
    // ... if we wanted to add more messages, we could do so here.
  ]);

  // This is one of many optional parameters available for the OpenAI chat model.
  // input.temperature = 0.7;
  input.responseFormat = ResponseFormat.Json;

  // Here we invoke the model with the input we created.
  const output = model.invoke(input);

  // The output is also specific to the OpenAIChatModel interface.
  // Here we return the trimmed content of the first choice.
  return output.choices[0].message.content.trim();
}

export function pipeline(doc: KGDocument): string {
  var status = "";
  const entities = extractEntities(doc).entities;
  // list entities in the status
  status += "Entities:\n";
  for (let i = 0; i < entities.length; i++) {
    status += `  ${entities[i].label} is a ${entities[i].is_a}\n`;
  }
  addEntities(entities,doc.id);
  const relatedEntities = extractRelatedEntities(doc.text, entities);
  // list related entities in the status
  status += "Related Entities:\n";
  for (let i = 0; i < relatedEntities.length; i++) {
    status += `${relatedEntities[i].is_a} about ${relatedEntities[i].subject.label} : ${relatedEntities[i].label}
     ${relatedEntities[i].description}\n`;
  }
  saveRelatedEntities(relatedEntities);
  return status;
}

export function suggestEntities(text: string): string {
  // The imported OpenAIChatModel interface follows the OpenAI chat completion model input format.
  const model = models.getModel<OpenAIChatModel>("llm");
  model.debug = MODEL_DEBUG;
  const instruction = `You are building a knowledge base. Suggest entity concepts mentioned in the prompt.
  Reply with a JSON document containing the list of entities types and a short semantic description using the example:
  ["entities": [{"type": "Planet", "description": "a celestial body.", "pertinence": "a score of pertinence of the entity type to the prompt"}]
  Spot only abstract types that can apply to several entities and that are not in the Known types list.
  Known types:
  """
  Person: a human being identified by name or pronoun.
  CelestialBody: a natural object in space, such as a planet, moon, or star.
  Location: a place or position.
  Organization: a group of people identified by a name.
  AgentiveEvent: an event involving an agent that has occurred in the past and is now considered an established fact
  Fact: something we know to be true about an entity.
  """
 

  
  `;

  // We'll start by creating an input object using the instruction and prompt provided.
  const input = model.createInput([
    new SystemMessage(instruction),
    new UserMessage(text),
    // ... if we wanted to add more messages, we could do so here.
  ]);

  // This is one of many optional parameters available for the OpenAI chat model.
  // input.temperature = 0.7;
  input.responseFormat = ResponseFormat.Json;

  // Here we invoke the model with the input we created.
  const output = model.invoke(input);

  // The output is also specific to the OpenAIChatModel interface.
  // Here we return the trimmed content of the first choice.
  return output.choices[0].message.content.trim();
}
