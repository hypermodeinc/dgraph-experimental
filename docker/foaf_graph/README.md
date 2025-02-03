# Dgraph FOAF Example Cluster

This container is now running a three group cluster (no replicas) with a single Zero member.

### Ratel is Dgraph's HTML dashboard for interacting with a cluster.
### [Open Ratel](https://play.dgraph.io?latest)

## Know Thy Graph & Apollo Tracing

[Query By Person First](https://studio.apollographql.com/sandbox/explorer?endpoint=http%3A%2F%2Flocalhost%3A8080%2Fgraphql&explorerURLState=N4IgJg9gxgrgtgUwHYBcQC4QEcYIE4CeABAA4IQkA2CA6gJYoAWA8pWAgM4oAKCKHACgAkAMzqUU%2BdEV4oAYuMl4AlEWAAdJESI58BXng4QtAASgBDDhfZrN27UnOI79svwFiJUoqMX5VGlr22uYA5ggu2gC%2BLjFIUSBRQA)

[Query By Pet First](https://studio.apollographql.com/sandbox/explorer?endpoint=http%3A%2F%2Flocalhost%3A8080%2Fgraphql&explorerURLState=N4IgJg9gxgrgtgUwHYBcQC4QEcYIE4CeABAIq6EAKCKAFACQBmAlgDYr7pFUoBir7eAJRFgAHSREiOfAW41mbDkUb98wsRMlEAhgHME4rUSTbEhrRADuSfCJOIAvuadIHIB0A)

## GraphQL Tools

### [Apollo Studio Sandbox](https://studio.apollographql.com/sandbox/explorer?endpoint=http%3A%2F%2Flocalhost%3A8080%2Fgraphql&explorerURLState=N4IgJg9gxgrgtgUwHYBcQC4QEcYIE4CeABAKIAeAhnAA4A2CAiroQBQAkAZgJZ4DOK6IgElUASiLAAOkiJEc%2BAgAV8vCEhbc%2BAopx79xUmbKJcw040SRUE5ogF9pdkABoQANwp4uFAEb1eGCCGspIgmvyhggCMAAyOIHZAA)

### [Galaxt Modeler](https://www.datensen.com/data-modeling/galaxy-modeler-for-graphql.html)

### [Graffy](https://chromewebstore.google.com/detail/graffy/hpbbfdcfeinlpdhhjanfhkadiccofeif?hl=en-US&pli=1)


## DQL Queries from the Presentation

Syntax Basics
```graphql
{
  all_peeps(func: type(Person)) {
    Person.name
    Person.pets {
      Pet.name
    }
  }
}
```

Query Variables
```graphql
{
  PEOPLE as var(func: type(Person))
  
  my_peeps(func: uid(PEOPLE)) {
    Person.name
  }
}
```

Query Variables Continued
```graphql
{
    var(func: type(Person)) @filter(gt(Entity.age, 80)) {
        PETS as Person.pets
    }
  
    pets_of_elderly(func: uid(PETS)) {
        Pet.name
        Pet.owner {
            Person.name
            Entity.age
        }
    }
}
```

Additional Block
```graphql
    check_out_the_uid_map(func: uid(PET_AGE), orderdesc: Entity.age) {
        Pet.name
        petAge:Entity.age
        Pet.owner {
            Person.name
            Entity.age
        }
    }
```