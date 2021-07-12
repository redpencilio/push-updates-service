import {
    app,
    uuid,
    query,
    sparqlEscape
} from "mu";
import bodyParser from "body-parser";

let deleteAfterConsumption = process.env.PUSH_UPDATES_DELETE_AFTER_CONSUMPTION;
let sort = process.env.PUSH_UPDATES_SORTING_METHOD || "" // must be "ASC" or "DESC" all other values are interpreted as falsy (no sorting)
let refreshTimeout = process.env.PUSH_UPDATES_REFRESH_TIMEOUT || 10;
let maxTimeout = process.env.PUSH_UPDATES_MAX_TIMEOUT || 80; // in seconds
let maxRetrySparql = maxTimeout * 1000 / refreshTimeout - 10;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
app.use(bodyParser.json());

// A map containing booleans per tabId to indicate a new push update is ready for that tab
let readyTabIds = {}

app.get("/push-update/", async function(req, res) {
    let sorting = ""
    if (["ASC", "DESC"].includes(sort)) {
        sorting = `ORDER BY ${sort}(?date)`
    }
    let retry = 0;

    let id = req.get("MU-TAB-ID");
    while (!readyTabIds[id] && retry < maxRetrySparql) {
        await sleep(refreshTimeout)
        retry++
    }
    if (retry !== maxRetrySparql) {
        console.log(`Waited ${retry*refreshTimeout}ms for tab ${id}`)
        console.log(new Date())
        readyTabIds[id]--;

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

        if (response.results.bindings.length > 0) {
            let resourceUrl = response.results.bindings[0].update.value;
            q = `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
            PREFIX mupush: <http://mu.semte.ch/vocabularies/push/>
            SELECT ?data ?type ?realm
            WHERE {
              GRAPH <http://mu.semte.ch/application> {
                <${resourceUrl}>    rdf:value ?data;
                                    mupush:realm ?realm;
                                    mupush:type ?type.
              }
            }`;
            response = await query(q)
            let pushUpdate = response.results.bindings[0];
            res.send({
                data: JSON.parse(pushUpdate.data.value),
                realm: pushUpdate.realm,
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
                }`
                query(q)
                    .then(() => {
                        console.log(`Deleting ${resourceUrl} from database worked`)
                    })
                    .catch((error) => {
                        console.error(error)
                    })
            }
        } else {
            res.status(204).send({})
        }
    } else {
        res.status(204).send({})
    }
});

app.post("/.mu/delta", async function(req, res) {
    console.log("Got delta")
    console.log(new Date())

    res.status(204).send()

    // Since we're only interested in new push updates being made, we don't check the deletes
    for (let delta of req.body) {
        for (let entry of delta.inserts) {
            if (entry.predicate.value === 'http://mu.semte.ch/vocabularies/push/tabId') {
                if (!readyTabIds[entry.object.value]) {
                    readyTabIds[entry.object.value] = 1;
                } else {
                    readyTabIds[entry.object.value]++;
                }
            }
        }
    }
})
