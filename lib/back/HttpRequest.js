/**
*
* @author J. Bradley Briggs
*/
module.exports = class HttpRequest {
    constructor() {
        this.http = require('http');
    }

    getJSON(url) {
        const requestUrl = new URL(url);
        return new Promise((resolve, reject) => {
            this.http.get(requestUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('error', (err) => {
                    reject(err);
                })

                res.on('end', () => {
                    resolve(JSON.parse(data));
                })
            }).end();
        });
    }

    getData(url, encoding = "binary") {
        const requestUrl = new URL(url);
        return new Promise((resolve, reject) => {
            var Stream = require('stream').Transform;
            this.http.get(requestUrl, (res) => {
                var data = new Stream();
                res.on('data', (chunk) => {
                    data.push(chunk);
                });

                res.on('error', (err) => {
                    reject(err);
                })

                res.on('end', () => {
                    var buf = Buffer.from(data.read());
                    resolve(buf.toString(encoding));
                })
            }).end();
        });
    }
}