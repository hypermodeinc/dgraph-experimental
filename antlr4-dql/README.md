

```sh
antlr4-parse DQL.g4 request -tree tests/test01.txt
```

## eq
eq(predicate, value)
eq(val(varName), value)
eq(predicate, val(varName))
eq(count(predicate), value)
eq(predicate, [val1, val2, ..., valN])
eq(predicate, [$var1, "value", ..., $varN])


## IE
less than, less than or equal to, greater than and greater than or equal to
Syntax Examples: for inequality IE

IE(predicate, value)
IE(val(varName), value)
IE(predicate, val(varName))
IE(count(predicate), value)

le, lt, ge or gt
## between
Syntax Example: between(predicate, startDateValue, endDateValue)

Schema Types: Scalar types, including dateTime, int, float and string
## uid
q(func: uid(<uid>))
predicate @filter(uid(<uid1>, ..., <uidn>))
predicate @filter(uid(a)) for variable a
q(func: uid(a,b)) for variables a and b
q(func: uid($uids)) for multiple uids in DQL Variables. You have to set the value of this variable as a string (e.g"[0x1, 0x2, 0x3]") in queryWithVars.

## uid_in
q(func: ...) @filter(uid_in(predicate, <uid>))
predicate1 @filter(uid_in(predicate2, <uid>))
predicate1 @filter(uid_in(predicate2, [<uid1>, ..., <uidn>]))
predicate1 @filter(uid_in(predicate2, uid(myVariable) ))

## type
type(name)
has(name)

## 
allofterms(predicate, "space-separated term list")
anyofterms(predicate, "space-separated term list")
alloftext(predicate, "space-separated text") and anyoftext(predicate, "space-separated text")

- lang support
comment@.
comment@jp:.
comment@en:fr
comment@en
comment@*

- ordering and paging in fields using values or query parameters.

- expand 

# TODOs
- geolocation  
- between and other functions
- check orderdesc: val(a) like director.film (orderdesc: val(movie_total), first: 5)

# OPEN QUESTIONS
from the doc we can use filters on count:
```
C as count(~genre @filter(uid(F)))
```
Is it possible to use filter with count in filters and at the root level filter ?

What are the characters allowed for the name of a block, for an alias, for a predicate ?

Seems that it is
```txt
[A-Za-z_] [.0-9A-Za-z_]*
```
- cannot start with dot or a number but can contain dots and numbers.
- can start and contain underscore and alplha.
- at least one character.

Is that true?


What are the characters allowed in predicate name between < >?
