import {
    app,
    uuid,
    query,
    sparqlEscape
} from "mu";

let deleteAfterConsumption = true

app.get("/push-update/", async function(req, res) {
    let id = req.get("MU-TAB-ID");
    let q = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX mupush: <http://mu.semte.ch/vocabularies/push/>
    SELECT ?update
    WHERE {
      GRAPH <http://mu.semte.ch/application> {
        ?update mupush:tabId "${id}";
                a mupush:PushUpdate .
      }
    }
    LIMIT 1`;
    let updates = [];
    let response = await query(q)
    if (response.results.bindings.length > 0) {
        let resourceUrl = response.results.bindings[0].update.value;
        q = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX mupush: <http://mu.semte.ch/vocabularies/push/>
        SELECT ?data ?type
        WHERE {
          GRAPH <http://mu.semte.ch/application> {
            <${resourceUrl}>    rdf:value ?data;
                                mupush:type ?type.
          }
        }`;
        response = await query(q)
        console.log(response.results.bindings[0])
        let pushUpdate = response.results.bindings[0];
        res.send({
            data: JSON.parse(pushUpdate.data.value),
            type: pushUpdate.type
        })
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
                .then(() => {
                    console.log(`Deleting ${resourceUrl} from database worked`)
                })
                .catch((error) => {
                    console.error(error)
                })
        }
    } else {
        res.send({})
    }
});
