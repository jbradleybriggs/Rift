/*module.exports = */class RiftServer {
    constructor(requestHandler, port) {
        const http = require('http');
        this.server = http.createServer((req, res) => {
            //handle requests
            requestHandler.handle(req, res);
        }).listen(port);
    }

    close() {
        this.server.close();
    }

}

var mysql = require('./MysqlConnector');
var handler = require('./RequestHandler');
var rh = new handler(mysql);
//var m = new mysql()
var rs = new RiftServer(rh, 8080);