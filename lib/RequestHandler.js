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
                // console.log("\tDB REQUEST: " + chalk.yellow(data));
                /*var json = {};
                //Parse request
                var formData = decodeURI(data).replace('%3A+', ':').split('&').forEach((val) => {
                    var equals = val.indexOf('=');
                    var keyValue = [];
                    if (equals != -1) {
                        var kv = val.split('=');
                        json[kv[0]] = kv[1];
                    }
                });*/
                if (data) {
                    var json = JSON.parse(data);
                    // console.log("\t" + chalk.green("Successfully Parsed Data:") + data);
                    console.log("\t[REQUEST BODY]: " + chalk.yellowBright(data));

                    //do database query
                    if (json.op && json.db && json.table) {
                        //var conn = new this.connector('192.168.21.51', 'root', 'hcet', json.db, json.table);
                        var conn = new this.connector(json.host, json.username, json.password, json.db, json.table);
                        console.log("\t[CONNECTED]: " + chalk.magentaBright(json.db) + "." + chalk.magentaBright(json.table));
                        if (json.op.toLowerCase() == 'get') {
                            conn.get(json.fields, json.conditions).then((val) => {
                                this.respond(res, val);
                                conn.close();
                            });
                        }
                        else if (json.op.toLowerCase() == 'search') {
                            conn.search(json.fields, json.conditions).then((val) => {
                                this.respond(res, val);
                                conn.close();
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