import {
    app,
    uuid,
    query,
    sparqlEscape
} from "mu";

let deleteAfterConsumption = process.env.PUSH_UPDATES_DELETE_AFTER_CONSUMPTION;
let sort = process.env.PUSH_UPDATES_SORTING_METHOD || "" // must be "ASC" or "DESC" all other values are interpreted as falsy (no sorting)
let refreshTimeout = process.env.PUSH_UPDATES_REFRESH_TIMEOUT || 1000;
let maxTimeout = process.env.PUSH_UPDATES_MAX_TIMEOUT || 80; // in seconds
let maxRetrySparql = maxTimeout * 1000 / refreshTimeout - 5;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


app.get("/push-update/", async function(req, res) {
    let sorting = ""
    if (["ASC", "DESC"].includes(sort)) {
        sorting = `ORDER BY ${sort}(?date)`
    }
    let id = req.get("MU-TAB-ID");
    let q = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX mupush: <http://mu.semte.ch/vocabularies/push/>
    PREFIX dc:  <http://purl.org/dc/terms/>
    SELECT ?update
    WHERE {
      GRAPH <http://mu.semte.ch/application> {
        ?update mupush:tabId "${id}";
                dc:created ?date;
                a mupush:PushUpdate .
      }
    }
    ${sorting}
    LIMIT 1`;
    let updates = [];
    let response = await query(q)

    let retry = 0;
    while (response.results.bindings.length == 0 && retry < maxRetrySparql) {
        await sleep(refreshTimeout)
        retry++
        // console.log(`retry numero ${retry}`)
        response = await query(q)
        // console.log(response.results.bindings)
    }

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
        res.status(404).send({})
    }
});
