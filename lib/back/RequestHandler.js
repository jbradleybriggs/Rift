module.exports = class RequestHandler {
    constructor(connector) {
        this.connector = connector;
    }

    handle(req, res) {
        if (req.method == 'POST') {
            //get body
            let data = '';

            req.on("data", (chunk) => {
                data += chunk;
            });

            //got the body
            req.on('end', () => {
                var json = {};
                //Parse request
                var formData = decodeURI(data).replace('%3A+', ':').split('&').forEach((val) => {
                    var equals = val.indexOf('=');
                    var keyValue = [];
                    if (equals != -1) {
                        var kv = val.split('=');
                        json[kv[0]] = kv[1];
                    }
                });

                //do database query
                if (json.op && json.db && json.table) {
                    var conn = new this.connector('192.168.21.51', 'root', 'hcet', json.db, json.table);

                    if (json.op.toLowerCase() == 'get') {
                        conn.get(JSON.parse(json.fields), JSON.parse(json.conditions)).then((val) => {
                            this.respond(res, val);
                            conn.close();
                        });
                    }

                }

            })
        }
    }

    respond(res, data) {
        res.writeHead(200, { 'Content-Type': 'text/json' });
        //console.log(data);
        res.write(JSON.stringify(data));
        res.end();
    }
}