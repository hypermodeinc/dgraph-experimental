import { models } from "@hypermode/modus-sdk-as";
import { JSON } from "json-as";
import {
  OpenAIChatModel,
  ResponseFormat,
  SystemMessage,
  UserMessage,
} from "@hypermode/modus-sdk-as/models/openai/chat";

import { 
    addHypermodeDefaultSchema
  } from "./kg-schema-default";
import { Entity, getKGSchemas, KGClass, ListOf, addEntities} from "./kg-kit";
export { addHypermodeDefaultSchema } from "./kg-schema-default";

const DEFAULT_NAMESPACE = "Hypermode/default";
const MODEL_DEBUG = false;

  /**
 * Extract entities from a text 
 * Given a list of namespaces.
 * @param text - The text to extract entities from.
 * @param namespaces - The list of namespaces to extract entities from.
 * if no namespace is provided, the default namespace is used.
 * if the default namespace is not found it is added to the Knowledge Graph.
 * 
 */
@json
class ExtractEntitiesResponse {
  status: string = "Success";
  msg: string | null = null;
  entities: Entity[] = [];
}

export function extractEntities(
  text: string,
  verify: bool = false,
  save: bool = true,
  namespaces: string[] | null = null,
): ExtractEntitiesResponse {
  const response = new ExtractEntitiesResponse();
  // if not provided get the ontology from the connected Knowledge Graph
  // extractEntities can be used in a pipeline where the ontology is already loaded
  // or to test an ontology before saving it to the Knowledge Graph

  let ontologies = getKGSchemas(namespaces);
  // if no ontology is found, add the default ontology and use it
  if (ontologies == null) {
    ontologies = [addHypermodeDefaultSchema()];
  }
  // group all entities form the ontologies
  const all_classes: KGClass[] = [];
  for (let o = 0; o < ontologies.length; o++) {
    const ontology = ontologies[o];
    for (let i = 0; i < ontology.classes.length; i++) {
      all_classes.push(ontology.classes[i]);
    }
  }

  // The imported OpenAIChatModel interface follows the OpenAI chat completion model input format.
  const model = models.getModel<OpenAIChatModel>("llm");
  model.debug = MODEL_DEBUG;
  response.msg = `Looking for entities of type: \n`;
  var instruction = `User submits a text. List the main entities from the text.
  Look for all entities types from this list:
  `;
 
  for (let i = 0; i < all_classes.length; i++) {
    if (all_classes[i].role == "MAIN") {
      instruction += `${all_classes[i].label}: ${all_classes[i].description}\n`;
      response.msg! += `${all_classes[i].label}\n`;
    }
  }
  

  instruction += `Reply with a JSON document containing the list of entities with an identifier label and a short semantic description.

  Follow this example:
  {
    "list": [
      {
        "label": "name or short label", 
        "is_a": "one of the entity type", 
        "description": "description found in the text if any",
      }
    ]
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
  console.log(`LLM Response: ${llm_response}`);
  const list = JSON.parse<ListOf<Entity>>(llm_response).list;
  
  
  /*
   * Entity extraction using an LLM can lead to error when many entities are present in the text.
   * We need to verify the entities extracted by the LLM.
   */
  const verified_response: Entity[] = [];
  for (let i = 0; i < list.length; i++) {
    if (verifyEntity(list[i], all_classes, verify)) {
      verified_response.push(list[i]);
    } else {
      console.warn(`Removing ${list[i].is_a} : ${list[i].label} `);
      response.msg! += `Removing ${list[i].is_a} : ${list[i].label} \n`;
    }
  }
  console.log(`Verified Entities: ${JSON.stringify(verified_response)}`);
  setEntityClassIdFromLabel(verified_response, all_classes);
  response.entities = verified_response;
  if (save) {
    addEntities(verified_response);
  }
  return response;
}

function setEntityClassIdFromLabel(entities: Entity[], classes: KGClass[]): void {
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        for (let j = 0; j < classes.length; j++) {
            if (classes[j].label == entity.is_a) {
                entity.is_a = classes[j].id;
                break;
            }
        }
    }
}

function verifyEntity(entity: Entity, classes: KGClass[], llm_verification: bool = false): bool {
  // verify the the entity is present in the classes
  if (!isValidEntity(entity, classes)) {
    return false;
  }
  if (llm_verification) {
    const description: string =
      entity.description != null ? entity.description! : "";
    const assertion = `${entity.label}, ${description} is a ${entity.is_a}.`;
    return verifyAssertion(assertion);
  }
  return true;
}

/**
 *
 * This function is used to verify the entities extracted by the LLM.
 * This can be done with an entailment model trained on the ontology.
 * We are using an LLM at the moment.
 */
function isValidEntity(entity: Entity, classes: KGClass[]): bool {

  // verify the the entity is present in the classes
  for (let i = 0; i < classes.length; i++) {
    if (classes[i].label == entity.is_a) {
      return true;
    }
  }
  return false
}

function verifyAssertion(assertion: string): bool {
  var instruction =
    `Reply 'true' or 'false' to following assertion: ` + assertion;
  const model = models.getModel<OpenAIChatModel>("llm");
  const input = model.createInput([new UserMessage(instruction)]);
  input.responseFormat = ResponseFormat.Text;
  return model
    .invoke(input)
    .choices[0].message.content.toLowerCase()
    .includes("true");
}