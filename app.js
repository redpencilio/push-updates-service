import { app, uuid, query, sparqlEscape } from "mu";

let deleteAfterConsumption=true

app.get("/push-update/:id", async function (req, res) {
  let id = req.params.id;
    let q = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    SELECT ?update
    WHERE {
      GRAPH <http://mu.semte.ch/application> {
        ?update ext:tabId "${id}";
                a ext:PushUpdate .
      }
    }
    LIMIT 1`;
    let updates = [];
    let response = await query(q)
    if (response.results.bindings.length > 0){
        let resourceUrl = response.results.bindings[0].update.value;
        q = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        SELECT ?value
        WHERE {
          GRAPH <http://mu.semte.ch/application> {
            <${resourceUrl}> rdf:value ?value.
          }
        }`;
        response = await query(q)
        res.send(response.results.bindings[0].value.value)
        if (deleteAfterConsumption) {
            q = `
            WITH <http://mu.semte.ch/application>
            DELETE
                {?s ?p ?o}
            WHERE {
                FILTER (?s = <${resourceUrl}> )
                ?s ?p ?o
            }
            `
            query(q)
                .then(()=>{console.log(`Deleting ${resourceUrl} from database worked`)})
                .catch((error)=>{console.error(error)})
        }
    } else {
        res.send({})
    }
});
