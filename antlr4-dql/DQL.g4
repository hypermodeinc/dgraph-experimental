/*
 Dgraph DQL grammar created from GraphQL grammar
    

 */

grammar DQL;
parameterization
    : operationType name parameterDefinitions
    | operationType
    ;
request
    : operation+ EOF
    ;

operation
    : parameterization? body
    ;

operationType
    : 'query'
    | 'mutation'
    ;

body: '{' block+ '}' ;

block
    : anonymousBlock
    | varBlock
    | namedBlock
    ;

varBlock: name 'as' 'var' root selectionSet;

anonymousBlock: 'var' root selectionSet;

namedBlock: name root selectionSet;

root: '(' 'func' ':' rootCriteria pagingOrOrdering* ')' rootDirective* rootFilter? rootDirective*;


rootFilter: '@filter' '(' filterCriteria ')';
fieldFilter: '@filter' '(' filterCriteria ')';

/* rootCriteria 
eq(predicate, value)
eq(val(varName), value)
eq(predicate, val(varName))
eq(count(predicate), value)
eq(predicate, [val1, val2, ..., valN])
eq(predicate, [$var1, "value", ..., $varN])
*/

predicate
    : BRACKET_STRING
    | name('@' lang)?
    | 'uid'
    ;
typeName
    : BRACKET_STRING
    | name
    ;
lang
    : 'en'
    | 'fr'
    ;

rootCriteria
    : eqCriteria 
    | termsOrTextCriteria
    | ieCriteria
    | hasCriteria
    | typeCriteria
    | uidCriteria
    ;
filterCriteria
    : eqCriteria
    | termsOrTextCriteria
    | ieCriteria
    | hasCriteria
    | typeCriteria
    | uidCriteria
    | 'NOT' filterCriteria
    | filterCriteria 'AND' filterCriteria
    | filterCriteria 'OR' filterCriteria
    | '(' filterCriteria ')'
    ;

eqCriteria: EQ '(' eqArgs ')';
eqArgs
    : predicate COMMA value
    | valOf COMMA value
    | countOf COMMA intOrParam
    | predicate COMMA listValue
    ;

ieCriteria: ieOp '(' ieArgs ')' ;
reserved: LE | LT | GT | GE | EQ | HAS | TYPE;

ieOp: LE | LT | GT | GE ;
ieArgs
    : predicate COMMA value
    | predicate COMMA valOf
    | valOf COMMA value
    | countOf COMMA intOrParam
    ;

termsOrTextCriteria: termsOrTextOp '(' predicate COMMA termsOrTextVal ')';
termsOrTextVal: STRING;

termsOrTextOp: 'anyofterms' | 'allofterms' | 'anyoftext' | 'alloftext';

hasCriteria: HAS '(' predicate ')';
typeCriteria: TYPE '(' typeName ')';
uidCriteria: 'uid' '(' listUidValue ')';
uidValue: hexValue | parameter;
listUidValue: uidValue ( COMMA uidValue )*;

variable: name | 'gt';
variableDeclaration: variable 'as';
listVariable: variable ( COMMA variable )*;
pagingOrOrdering
    : pagingFirst
    | pagingOffset
    | pagingAfter
    | ordering
    ;


pagingFirst: 'first' ':' intValue;
pagingOffset: 'offset' ':' intValue;
pagingAfter: 'after' ':' uidValue;

ordering: orderingDirection ':' (predicate | valOf);

orderingDirection: 'orderasc' | 'orderdesc';

valOf: 'val' '(' variable ')';

countOf: 'count' '(' predicate ')';

selectionSet
    : '{' field* expand? field* '}'
    ;
subSelectionSet
    : fieldFilter? '{' field* expand? field* '}'
    ;
expand
    : EXPAND_ALL selectionSet? ;


//https://spec.graphql.org/October2021/#sec-Language.Fields
field
    : variableDeclaration? alias? predicate arguments? fieldDirectives? subSelectionSet?
    | variableDeclaration? alias? aggregation
    ;
aggregation
    : 'sum' '(' 'val' '(' name ')' ')'
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





//https://spec.graphql.org/October2021/#sec-Input-Values
value
    : parameter
    | intValue
    | hexValue
    | floatValue
    | stringValue
    | booleanValue
    | nullValue
    | enumValue
    | objectValue
    ;
intOrParam
    : parameter
    | intValue
    ;
hexOrParam
    : parameter
    | hexValue
    ;

//https://spec.graphql.org/October2021/#sec-Int-Value
intValue
    : INT
    ;
hexValue: HEX_NUMBER;

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
    | '[' value (COMMA value)* ']'
    ;

//https://spec.graphql.org/October2021/#sec-Input-Object-Values
objectValue
    : '{' objectField* '}'
    ;

objectField
    : name ':' value
    ;

//https://spec.graphql.org/October2021/#sec-Language.Variables
parameter
    : '$' name
    ;

parameterDefinitions
    : '(' parameterDefinition* ')'
    ;

parameterDefinition
    : parameter ':' type_ defaultValue?
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
    : name | RESERVED
    ;

listType
    : '[' type_ ']'
    ;


rootDirectives: rootDirective+ ;

//TO DO add  arguments for some directive like  @recurse

rootDirective
    : '@recurse'
    | '@cascade'
    | '@normalize'
    ;
fieldDirectives: fieldDirective+ ;
fieldDirective
    : '@test'
    ;









//https://spec.graphql.org/June2018/#OperationTypeDefinition
//operationTypeDefinition: operationType ':' namedType; //removed in 2021

//https://spec.graphql.org/June2018/#sec-Descriptions
description
    : stringValue
    ;

//https://spec.graphql.org/October2021/#sec-Names
name: NAME;

// name cannot start with a digit.
NAME
    : [A-Za-z_] [.0-9A-Za-z_]*
    ;

fragment CHARACTER
    : (ESC | ~ ["\\])
    ;
fragment NON_BRACKET_CHARACTER
    : (ESC | ~ [>])
    ;
BRACKET_STRING
    : '<' NON_BRACKET_CHARACTER* '>'
    ;
EXPAND_ALL: '__expand_all__';
STRING
    : '"' CHARACTER* '"'
    ;

BLOCK_STRING
    : '"""' .*? '"""'
    ;

ID
    : STRING
    ;

GT: 'gt';
GE: 'ge';
LT: 'lt';
LE: 'le';
EQ: 'eq';
HAS: 'has';
TYPE: 'type';

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
HEX_NUMBER: '0x' HEX+;

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
    : ',' // -> skip
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