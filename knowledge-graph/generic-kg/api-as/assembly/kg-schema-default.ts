
import { KGSchema,getKGSchemaByNames, addKGSchema, addKGClass } from "./kg-kit";  

export function addHypermodeDefaultSchema(): KGSchema[] {
    addKGSchema("Hypermode/default", "The default schema for the Hypermode knowledge graph");
    addKGClass("Hypermode/default", [
        {
            role: "MAIN",
            label: "Person",
            description: "a human being"
        },
        {
            role: "MAIN",
            label: "Location",
            description: "generic location, country, city region etc..."
        },
        {
            role: "MAIN",
            label: "Organization",
            description: "An organization such as a school, NGO, corporation, club, etc."
        },
        {
            role: "MAIN",
            label: "LocalBusiness",
            description: "A particular physical business or branch of an organization"
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

    return getKGSchemaByNames(["Hypermode/default"])
}
