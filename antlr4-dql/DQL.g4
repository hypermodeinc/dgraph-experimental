/*
 Dgraph DQL grammar created from GraphQL grammar
    

 */

grammar DQL;
request
    : operation EOF
    ;

operation
    : parameterization? body
    ;
parameterization
    : operationType
    | operationType name variableDefinitions
    ;

operationType
    : 'query'
    | 'mutation'
    ;

body
    : '{' block+ '}'
    ;
block
    : varBlock | namedBlock ;
/*
var(func:...)
var a as data(func:...)
data(func:)
*/

varBlock: var root selectionSet;

var: 'var';

namedBlock: name root selectionSet;

root: '(' 'func' ':' rootCriteria pagingOrOrdering* ')';

/* rootCriteria 
eq(predicate, value)
eq(val(varName), value)
eq(predicate, val(varName))
eq(count(predicate), value)
eq(predicate, [val1, val2, ..., valN])
eq(predicate, [$var1, "value", ..., $varN])
*/

predicate: name;

rootCriteria
    : eqCriteria 
    ;
eqCriteria
    : 'eq' '(' eqArgs ')';
eqArgs
    : predicate value 
    | valOf value
    | countOf value
    | predicate listValue
    | predicate listVariable
    ;

listVariable: '[' variable+ ']';

pagingOrOrdering
    : paging
    | ordering
    ;

paging : 'first' ':' intValue;

ordering: orderingDirection orderingData;

orderingDirection: 'orderasc' | 'orderdec';
orderingData: name | valOf;
valOf: 'val' '(' name ')';

countOf: 'count' '(' name ')';

selectionSet
    : '{' selection+ '}'
    ;

selection
    : field
    ;

//https://spec.graphql.org/October2021/#sec-Language.Fields
field
    : alias? name arguments? directives? selectionSet?
    ;

//https://spec.graphql.org/October2021/#sec-Language.Arguments
arguments
    : '(' argument+ ')'
    ;

argument
    : name ':' value
    ;

//https://spec.graphql.org/October2021/#sec-Field-Alias
alias
    : name ':'
    ;

//https://spec.graphql.org/October2021/#sec-Language.Fragments
fragmentSpread
    : '...' fragmentName directives?
    ;

fragmentDefinition
    : 'fragment' fragmentName typeCondition directives? selectionSet
    ;

fragmentName
    : name
    ; // except on

//https://spec.graphql.org/October2021/#sec-Type-Conditions
typeCondition
    : 'on' namedType
    ;

//https://spec.graphql.org/October2021/#sec-Inline-Fragments
inlineFragment
    : '...' typeCondition? directives? selectionSet
    ;

//https://spec.graphql.org/October2021/#sec-Input-Values
value
    : variable
    | intValue
    | floatValue
    | stringValue
    | booleanValue
    | nullValue
    | enumValue
    | listValue
    | objectValue
    ;

//https://spec.graphql.org/October2021/#sec-Int-Value
intValue
    : INT
    ;

//https://spec.graphql.org/October2021/#sec-Float-Value
floatValue
    : FLOAT
    ;

//https://spec.graphql.org/October2021/#sec-Boolean-Value
booleanValue
    : 'true'
    | 'false'
    ;

//https://spec.graphql.org/October2021/#sec-String-Value
stringValue
    : STRING
    | BLOCK_STRING
    ;

//https://spec.graphql.org/October2021/#sec-Null-Value
nullValue
    : 'null'
    ;

//https://spec.graphql.org/October2021/#sec-Enum-Value
enumValue
    : name
    ; //{ not (nullValue | booleanValue) };

//https://spec.graphql.org/October2021/#sec-List-Value
listValue
    : '[' ']'
    | '[' value+ ']'
    ;

//https://spec.graphql.org/October2021/#sec-Input-Object-Values
objectValue
    : '{' objectField* '}'
    ;

objectField
    : name ':' value
    ;

//https://spec.graphql.org/October2021/#sec-Language.Variables
variable
    : '$' name
    ;

variableDefinitions
    : '(' variableDefinition* ')'
    ;

variableDefinition
    : variable ':' type_ defaultValue?
    ;

defaultValue
    : '=' value
    ;

//https://spec.graphql.org/October2021/#sec-Type-References
type_
    : namedType '!'?
    | listType '!'?
    ;

namedType
    : name
    ;

listType
    : '[' type_ ']'
    ;

//https://spec.graphql.org/October2021/#sec-Language.Directives
directives
    : directive+
    ;

directive
    : '@' name arguments?
    ;

// https://spec.graphql.org/October2021/#sec-Type-System
// deviation from 2018 specs. Added type system document
//https://spec.graphql.org/October2021/#TypeSystemDocument (new in 2021)
typeSystemDocument
    : typeSystemDefinition+
    ;

typeSystemDefinition
    : schemaDefinition
    | typeDefinition
    | directiveDefinition
    ;

// https://spec.graphql.org/October2021/#TypeSystemExtensionDocument (new in 2021)
typeSystemExtensionDocument
    : typeSystemExtension+
    ;

//https://spec.graphql.org/October2021/#sec-Type-System-Extensions
typeSystemExtension
    : schemaExtension
    | typeExtension
    ;

// https://spec.graphql.org/October2021/#sec-Schema
schemaDefinition
    : 'schema' directives? '{' rootOperationTypeDefinition+ '}'
    ;

rootOperationTypeDefinition
    : operationType ':' namedType
    ;

//https://spec.graphql.org/October2021/#sec-Schema-Extension (deviation from 2018)
schemaExtension
    : 'extend' 'schema' directives? '{' rootOperationTypeDefinition+ '}' //(new 2021)
    | 'extend' 'schema' directives
    ;

//https://spec.graphql.org/June2018/#OperationTypeDefinition
//operationTypeDefinition: operationType ':' namedType; //removed in 2021

//https://spec.graphql.org/June2018/#sec-Descriptions
description
    : stringValue
    ;

//https://spec.graphql.org/October2021/#sec-Types
typeDefinition
    : scalarTypeDefinition
    | objectTypeDefinition
    | interfaceTypeDefinition
    | unionTypeDefinition
    | enumTypeDefinition
    | inputObjectTypeDefinition
    ;

//https://spec.graphql.org/June2018/#sec-Type-Extensions
typeExtension
    : scalarTypeExtension
    | objectTypeExtension
    | interfaceTypeExtension
    | unionTypeExtension
    | enumTypeExtension
    | inputObjectTypeExtension
    ;

//https://spec.graphql.org/October2021/#sec-Scalars
scalarTypeDefinition
    : description? 'scalar' name directives?
    ;

//https://spec.graphql.org/October2021/#sec-Scalar-Extensions
scalarTypeExtension
    : 'extend' 'scalar' name directives
    ;

// https://spec.graphql.org/October2021/#sec-Objects
objectTypeDefinition
    : description? 'type' name implementsInterfaces? directives? fieldsDefinition?
    ;

implementsInterfaces
    : 'implements' '&'? namedType
    | implementsInterfaces '&' namedType
    ;

fieldsDefinition
    : '{' fieldDefinition+ '}'
    ;

fieldDefinition
    : description? name argumentsDefinition? ':' type_ directives?
    ;

//https://spec.graphql.org/October2021/#sec-Field-Arguments
argumentsDefinition
    : '(' inputValueDefinition+ ')'
    ;

inputValueDefinition
    : description? name ':' type_ defaultValue? directives?
    ;

//https://spec.graphql.org/October2021/#sec-Object-Extensions
objectTypeExtension
    : 'extend' 'type' name implementsInterfaces? directives? fieldsDefinition
    | 'extend' 'type' name implementsInterfaces? directives
    | 'extend' 'type' name implementsInterfaces
    ;

//https://spec.graphql.org/October2021/#sec-Interfaces  (deviation from 2018)
interfaceTypeDefinition
    : description? 'interface' name implementsInterfaces? directives? fieldsDefinition?
    ;

//https://spec.graphql.org/October2021/#sec-Interface-Extensions (deviation from 2018)
interfaceTypeExtension
    : 'extend' 'interface' name implementsInterfaces? directives? fieldsDefinition
    | 'extend' 'interface' name implementsInterfaces? directives
    ;

//https://spec.graphql.org/October2021/#sec-Unions
unionTypeDefinition
    : description? 'union' name directives? unionMemberTypes?
    ;

unionMemberTypes
    : '=' '|'? namedType ('|' namedType)*
    ;

//https://spec.graphql.org/October2021/#sec-Union-Extensions
unionTypeExtension
    : 'extend' 'union' name directives? unionMemberTypes
    | 'extend' 'union' name directives
    ;

//https://spec.graphql.org/October2021/#sec-Enums
enumTypeDefinition
    : description? 'enum' name directives? enumValuesDefinition?
    ;

enumValuesDefinition
    : '{' enumValueDefinition+ '}'
    ;

enumValueDefinition
    : description? enumValue directives?
    ;

//https://spec.graphql.org/October2021/#sec-Enum-Extensions
enumTypeExtension
    : 'extend' 'enum' name directives? enumValuesDefinition
    | 'extend' 'enum' name directives
    ;

//https://spec.graphql.org/October2021/#sec-Input-Objects
inputObjectTypeDefinition
    : description? 'input' name directives? inputFieldsDefinition?
    ;

inputFieldsDefinition
    : '{' inputValueDefinition+ '}'
    ;

//https://spec.graphql.org/June2018/#sec-Input-Object-Extensions
inputObjectTypeExtension
    : 'extend' 'input' name directives? inputFieldsDefinition
    | 'extend' 'input' name directives
    ;

//https://spec.graphql.org/October2021/#sec-Type-System.Directives (new 2021, repeatable )
directiveDefinition
    : description? 'directive' '@' name argumentsDefinition? 'repeatable'? 'on' directiveLocations
    ;

directiveLocations
    : directiveLocation ('|' directiveLocation)*
    ;

directiveLocation
    : executableDirectiveLocation
    | typeSystemDirectiveLocation
    ;

executableDirectiveLocation
    : 'QUERY'
    | 'MUTATION'
    | 'SUBSCRIPTION'
    | 'FIELD'
    | 'FRAGMENT_DEFINITION'
    | 'FRAGMENT_SPREAD'
    | 'INLINE_FRAGMENT'
    | 'VARIABLE_DEFINITION' // new 2021
    ;

typeSystemDirectiveLocation
    : 'SCHEMA'
    | 'SCALAR'
    | 'OBJECT'
    | 'FIELD_DEFINITION'
    | 'ARGUMENT_DEFINITION'
    | 'INTERFACE'
    | 'UNION'
    | 'ENUM'
    | 'ENUM_VALUE'
    | 'INPUT_OBJECT'
    | 'INPUT_FIELD_DEFINITION'
    ;

//https://spec.graphql.org/October2021/#sec-Names
name
    : NAME
    ;

//https://spec.graphql.org/October2021/#sec-Language.Source-Text.Lexical-Tokens
//Start lexer
NAME
    : [_A-Za-z] [_0-9A-Za-z]*
    ;

fragment CHARACTER
    : (ESC | ~ ["\\])
    ;

STRING
    : '"' CHARACTER* '"'
    ;

BLOCK_STRING
    : '"""' .*? '"""'
    ;

ID
    : STRING
    ;

//https://spec.graphql.org/October2021/#EscapedCharacter
fragment ESC
    : '\\' (["\\/bfnrt] | UNICODE)
    ;

fragment UNICODE
    : 'u' HEX HEX HEX HEX
    ;

fragment HEX
    : [0-9a-fA-F]
    ;

fragment NONZERO_DIGIT
    : [1-9]
    ;

fragment DIGIT
    : [0-9]
    ;

fragment FRACTIONAL_PART
    : '.' DIGIT+
    ;

fragment EXPONENTIAL_PART
    : EXPONENT_INDICATOR SIGN? DIGIT+
    ;

fragment EXPONENT_INDICATOR
    : [eE]
    ;

fragment SIGN
    : [+-]
    ;

fragment NEGATIVE_SIGN
    : '-'
    ;

//https://spec.graphql.org/October2021/#sec-Float-Value
FLOAT
    : INT FRACTIONAL_PART
    | INT EXPONENTIAL_PART
    | INT FRACTIONAL_PART EXPONENTIAL_PART
    ;

INT
    : NEGATIVE_SIGN? '0'
    | NEGATIVE_SIGN? NONZERO_DIGIT DIGIT*
    ;

//https://spec.graphql.org/October2021/#Punctuator
PUNCTUATOR
    : '!'
    | '$'
    | '('
    | ')'
    | '...'
    | ':'
    | '='
    | '@'
    | '['
    | ']'
    | '{'
    | '}'
    | '|'
    ;

// no leading zeros

fragment EXP
    : [Ee] [+\-]? INT
    ;

//https://spec.graphql.org/October2021/#sec-Language.Source-Text.Ignored-Tokens

// \- since - means "range" inside [...]

WS
    : [ \t\n\r]+ -> skip
    ;

COMMA
    : ',' -> skip
    ;

LineComment
    : '#' ~[\r\n]* -> skip
    ;

UNICODE_BOM
    : (UTF8_BOM | UTF16_BOM | UTF32_BOM) -> skip
    ;

UTF8_BOM
    : '\uEFBBBF'
    ;

UTF16_BOM
    : '\uFEFF'
    ;

UTF32_BOM
    : '\u0000FEFF'
    ;