

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

## geolocation - TODO 