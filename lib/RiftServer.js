/*module.exports = */class RiftServer {
    constructor(requestHandler, port) {
        const http = require('http');
        const chalk = require('chalk');

        this.server = http.createServer((req, res) => {
            //handle requests
            requestHandler.handle(req, res);
        }).listen(port).on('listening', () => {
            console.log(`Listening on port ` + chalk.bold.blueBright(port));
        });
    }

    close() {
        this.server.close();
    }

}

var mysql = require('./MysqlConnector');
var handler = require('./RequestHandler');
var rh = new handler(mysql);
//var m = new mysql()

var port = 8082 ;
if (process.argv && process.argv.length > 2) {
    port = process.argv[2] ;
}
var rs = new RiftServer(rh, port);

