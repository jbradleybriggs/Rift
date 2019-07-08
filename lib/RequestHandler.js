module.exports = class RequestHandler {
    constructor(connector) {
        this.connector = connector;
    }

    handle(req, res) {
        const chalk = require('chalk');
        console.log("[INCOMING] " + chalk.cyanBright(req.method) + " " + chalk.blueBright(req.url));
        // if (req.method == "OPTIONS")
        if (req.method == 'POST' || req.method == 'OPTIONS') {
            //get body
            let data = '';

            req.on("data", (chunk) => {
                data += chunk;
            });

            //got the body
            req.on('end', () => {
                if (data) {
                    var json = JSON.parse(data);
                    console.log("\t[REQUEST BODY]: " + chalk.yellowBright(data));

                    //do database query
                    if (json.db && json.table && json.password) {
                        //try to resolve any missing fields
                        if (!json.op) json.op = 'GET' ;
                        if (!json.username) json.username = 'root' ;
                        if (!json.host) json.host = 'localhost' ;
                        var conn = new this.connector(json.host, json.username, json.password, json.db, json.table);
                        console.log("\t[CONNECTED]: " + chalk.magentaBright(json.db) + "." + chalk.magentaBright(json.table));
                        var op = json.op.toLowerCase() ;
                        if (op == 'get') {
                            conn.get(json.fields, json.conditions, json.options).then((val) => {
                                this.respond(res, val);
                                conn.close();
                            });
                        }
                        else if (op == 'search') {
                            conn.search(json.fields, json.conditions, json.options).then((val) => {
                                this.respond(res, val);
                                conn.close();
                            });
                        }
                        else if (op == 'set') {
                            conn.set(json.values, json.conditions).then((val) => {
                                this.respond(res, val) ;
                                conn.close() ;
                            });
                        }
                        else if (op == 'delete') {
                            conn.delete(json.conditions).then((val) => {
                                this.respond(res, val) ;
                                conn.close() ;
                            });
                        }
                        else if (op == 'getInnerJoin') {
                            conn.getInnerJoin(json.fields, json.conditions, json.options).then((val) => {
                                this.respond(res, val) ;
                                conn.close() ;
                            });
                        }

                    }
                }
                else this.respond(res);
            })
        }
    }

    respond(res, data) {
        // allow cors
        res.writeHead(200, {
            'Content-Type': 'text/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Request-Method': '*',
            'Access-Control-Allow-Methods': 'POST, GET',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        if (data) res.write(JSON.stringify(data));
        res.end();
    }
}