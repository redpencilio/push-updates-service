# Push-updates polling version

The used prefixes are:
```
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX mupush: <http://mu.semte.ch/vocabularies/push/>
```

This is the backend providing push updates to be used in polling
The backend will provide a push update for a tab given the tab id, which should be stored in the `MU-TAB-ID` header.

The push update will be returned in the following json format
```
{
    data: <the rdf:value of the push update>,
    type: <the mupush:type of the push update>
}
```

The semantic model of a push update is defined in [this file](../model.md)
