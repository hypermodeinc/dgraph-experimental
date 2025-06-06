
import { KGSchema,getKGSchemas, addKGSchema, AddKGClassInput, GenericResult } from "./kg-kit";  

export function addHypermodeDefaultSchema(): KGSchema {
    const classes: AddKGClassInput[] = [
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
    ]
    return addKGSchema(
        "Hypermode/default", 
        "The default schema for the Hypermode knowledge graph",
        classes);

}

export function addHypermodeFoodIndustry(): KGSchema {
    const classes: AddKGClassInput[] = [
        { 
        role: "MAIN",
        label: "Food product",
        description: "food produced by a food production process."
        },
        { 
        role: "MAIN",
        label: "Ingredient",
        description: "raw ingredient involved in a food production process."
        },
        { 
        role: "MAIN",
        label: "Certification",
        description: "a quality label for food processing."
        }

    ]
    return addKGSchema(
        "Hypermode/food-industry", 
        "Classes for goods and services in the food industry",
        classes);

}
