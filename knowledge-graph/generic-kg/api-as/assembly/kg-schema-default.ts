
import { GenericResult,KGSchema, addKGSchema, addKGClass } from "./kg-kit";  

export function addHypermodeDefaultSchema(): GenericResult {
    addKGSchema("Hypermode/default", "The default schema for the Hypermode knowledge graph");
    addKGClass("Hypermode/default", [
        {
            role: "MAIN",
            label: "Person",
            description: "a human being"
        },
        {
            role: "MAIN",
            label: "CelestialBody",
            description: "A natural physical entity, that exists within the observable universe."
        },
        { 
            role: "RELATED",
            label: "Fact",
            description: "a something we know to be true about an entity being" 
        },
        {
            role: "RELATED",
            label: "Characteristic",
            description: "A feature or quality of an entity.."
        },
        {
            role: "RELATION",
            label: "AgentiveEvent",
            description: "an action performed by a person or entity, the 'subject', on another entity, 'the object'."
        }
    ]);
    return new GenericResult();
}
