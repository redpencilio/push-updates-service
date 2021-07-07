# Push-updates semantic model

The used prefixes are:
```
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX mupush: <http://mu.semte.ch/vocabularies/push/>
PREFIX dc:  <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
```
The push update is a mupush:PushUpdate and has the following properties

| Property | Description |
| --- | --- |
| mu:uuid       | The unique identifier of the push update |
| mupush:tabId  | The unique identifier of the tab for which the push update is meant |
| mupush:type   | The uri indicating the type scope of the push update |
| rdf:value     | A string literal value of the push update |
| dc:created    | A xsd:dateTime of the creation moment of the push update |
