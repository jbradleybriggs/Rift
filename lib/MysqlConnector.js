/**
*
* @author J. Bradley Briggs
*/
module.exports = class MysqlConnector {
    constructor(host, username, password, db, tableName = '') {
        this.mysql = require("mysql");
        this.tableName = tableName;
        this.chalk = require('chalk');
        this.connection = this.mysql.createConnection({
            host: host,
            user: username,
            password: password,
            database: db
        });
        this.connection.connect(
            (err) => {
                if (err) this.__throwError(err)
                else {
                    this.id = this.connection.threadId;
                    console.time("\t[TIME TAKEN]");
                }
                //console.log("Connected [thread id " + this.connection.threadId + "]");
            });
    }

    close() {
        this.connection.end(
            (err) => {
                if (err) this.__throwError(err)
                else console.timeEnd("\t[TIME TAKEN]");
                //console.log("Disconnected [thread id " + this.connection.threadId + "]");
            }
        );
    }

    table(tableName) {
        this.tableName = tableName;
        return this;
    }

    async query(sql) {
        console.log("\t[QUERY]: " + this.chalk.green(sql));
        return new Promise((resolve, reject) => {
            this.connection.query(sql,
                (error, results, fields) => {
                    if (error) reject(error);
                    else {
                        console.log("\t[RESULTS]: " + this.chalk.cyanBright(results.length));
                        resolve(results);
                    }
                });
        }).catch(
            (err) => this.__throwError(err)
        );
    }

    __throwError(msg) {
        console.log("\t" + this.chalk.redBright("[ERROR]: " + msg))
    }

    __getConcatClause(values, seperator) {
        if (Object.keys(values).length == 0) return "";
        var result = '';
        for (var field in values) {
            result += `\`${field}\` = "${values[field]}"${seperator}`;
        }
        result = result.slice(0, result.lastIndexOf(seperator));
        return result;
    }

    __getWhereClause(conditions) {
        if (Object.keys(conditions).length == 0) return "";
        return `WHERE ${this.__getConcatClause(conditions, ' AND ')}`;
    }

    __getFieldsClause(fields) {
        if (!fields || fields.length == 0) return "*";
        var result = '';
        for (var field in fields) {
            result += `\`${fields[field]}\`, `;
        }
        result = result.slice(0, result.lastIndexOf(', '));
        return result;
    }

    __getLikeClause(conditions) {
        if (Object.keys(conditions).length == 0) return "";
        var result = 'WHERE ';
        for (var field in conditions) {
            result += `\`${field}\` LIKE "${conditions[field]}" OR `;
        }
        result = result.slice(0, result.lastIndexOf(" OR "));
        return result;
    }

    /**
     * Gets particular fields from the table.
     * 
     * Usage: get(['name', 'surname', 'age'], {id: 90210}).then((res) => {console.log(res)}); //gets the name, surname and age of the person with an id of 90210.
     * 
     * Usage: get([], {id: 90210}).then((res) => {console.log(res)}); //gets all the data for the person with an id of 90210.
     * 
     * Usage: get(['name', 'surname']).then((res) => {console.log(res)}); //gets the name and surname of everyone in the table. 
     * 
     * Usage: get().then((res) => {console.log(res)}); //gets all the data in the table
     * 
     * @param {Array} fields 
     * @param {Object} conditions 
     */
    async get(fields = [], conditions = {}) {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        var sql = `SELECT ${this.__getFieldsClause(fields)} FROM ${this.tableName} ${this.__getWhereClause(conditions)}`;
        return this.query(sql);
    }

    /**
     * Gets all the data in the table.
     * 
     * Usage: getAll().then((res) => {console.log(res); //do something with result}) ;
     */
    async getAll() {
        return this.get();
    }

    /**
     * Inserts or Updates data into the table.
     * 
     * Usage: set({name: 'Bob', surname: 'Hoskins'}, {id: 90210}).then((res) => {console.log(res)}) ; //this will UPDATE a row with an id of 90210 with the name 'Bob' and the surname 'Hoskins'.
     * 
     * Usage: set({name: 'Bob', surname: 'Hoskins'}).then((res) => {console.log(res)}) ; //this will simply INSERT a new row with the name 'Bob' and the surname 'Hoskins'. 
     * 
     * @param {Object} values Data to update or insert into the table.
     * @param {Object} conditions (Optional) WHERE conditions. If this parameter 
     * is not specified, an INSERT query will be run. Otherwise an UPDATE query will be run.
     */
    async set(values, conditions = {}) {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        if (Object.keys(values).length == 0) return;
        if (Object.keys(conditions).length == 0) {
            var sql = `INSERT INTO ${this.tableName} (`;
            var sqlValues = "";
            for (var field in values) {
                sql += `\`${field}\`, `;
                if (values[field] != undefined && typeof (values[field]) == 'string' && values[field].includes("UNHEX('")) sqlValues += `${values[field]}, `;
                else sqlValues += `"${values[field]}", `;
            }
            sql = sql.slice(0, sql.lastIndexOf(', '));
            sqlValues = sqlValues.slice(0, sqlValues.lastIndexOf(', '));
            sql += `) VALUES ( ${sqlValues} )`;
        }
        else var sql = `UPDATE ${this.tableName} SET ${this.__getConcatClause(values, ', ')} ${this.__getWhereClause(conditions)}`;
        return this.query(sql);
    }

    /**
     * Deletes data from the table.
     * 
     * Usage: delete({id: 90210}).then((res) => {console.log(res)}) ; //this will delete a row with the id of 90210.
     * **WARNING** Running this function without specifying the conditions parameter, will result
     * in the following query being run: 'DELETE FROM table' - This will delete EVERYTHING in the table. Be careful.
     * @param {Object} conditions WHERE conditions required when deleting data.
     */
    async delete(conditions = {}) {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        var sql = `DELETE FROM ${this.tableName} ${this.__getWhereClause(conditions)}`;
        return this.query(sql);
    }

    async search(fields, conditions = {}) {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        var sql = `SELECT ${this.__getFieldsClause(fields)} FROM ${this.tableName} ${this.__getLikeClause(conditions)}`;
        return this.query(sql);
    }

    /**
     * Empties the table.
     */
    async emptyTable() {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        var sql = `TRUNCATE ${this.tableName}`;
        return this.query(sql);
    }

    /*
        fields example:
        {
            country_code: {
                type: 'char(1)', //if this is not specified - it will be set to varchar(255)
                default: ''
            }
            viewings: {
                type: 'varchar(100)',
                default: '',
                autoIncrement: true
            }
            vehicle_types: {
                type: ['truck', 'motorcycle', 'car', 'bicycle'] //for enum types
                default: 'not null',
            }
        }
        OR simply an array of field names:
        ['name', 'surname', 'age', 'id']
    */
    // async createNewTable(tableName, fields, engine = 'InnoDb') {
    //     if (!fields) reject("No field names specified.");
    //     var sql = `CREATE TABLE ${tableName} (`;
    //     if (fields.length != undefined) {
    //         for (var i in fields) {
    //             sql += `\`${fields[i]}\` VARCHAR(255) DEFAULT '', `;
    //         }
    //     }
    //     else if (typeof (fields) == 'object') {
    //         for (var field in fields) {
    //             //console.log(field);
    //             var attributes = fields[field]; //object
    //             sql += `\`${field}\` ${this.__parseAttributes(attributes)}, `
    //         }
    //     }
    //     sql = sql.slice(0, sql.lastIndexOf(', ')) + ")";
    //     if (engine && engine != '') sql += ` ENGINE = ${engine}`;
    //     console.log(sql);
    //     //return this.query(sql);
    // }

    __parseAttributes(attributes = {}) {
        if (!attributes || Object.keys(attributes).length == 0) return 'VARCHAR(255) DEFAULT \'\'';
        var type = 'VARCHAR(255)', defaultVal = 'DEFAULT DEFAULT \'\'', auto = "";
        for (var attribute in attributes) {
            switch (attribute.toLowerCase()) {
                case 'type':
                    if (typeof (attributes[attribute]) == 'object' && attributes[attribute].length > 0)
                        type = "ENUM(" + attributes[attribute].toString() + ")";
                    else
                        type = attributes[attribute];
                    break;
                case 'default':
                    defaultVal = `DEFAULT ${attributes[attribute]}`;
                    break;
                case 'auto_increment':
                    if (attributes[attribute]) auto = "AUTO_INCREMENT TRUE";
                    break;
                default:
                    break;
            }
        }
        return `${type} ${defaultVal} ${auto}`;
    }
    /*
        CREATE TABLE `lamp_light`.`test` ( 
            `col1` ENUM('name','id','ex','sd') NULL DEFAULT NULL , 
            `col2` VARCHAR(255) NULL DEFAULT NULL , 
            `col3` DATE NULL DEFAULT NULL , 
            `col4` JSON NOT NULL , 
            `col5` TIMESTAMP NOT NULL , 
            `col6` INT(10) NOT NULL ) 
            ENGINE = InnoDB;
    */
}
/*
var m = new Mysql("localhost", "root", "0f6fNF9D5Mqf0KTW", "lamp_light");
m.query("SELECT * FROM `movies`");
m.close();*/

// var m = new Mysql("localhost", "root", "0f6fNF9D5Mqf0KTW", "lamp_light");
// m.table("movies").get(['title', 'year'], { year: "2000" })
//     // getAll()
//     .then((value) => { console.log(value) });
// //set({ title: "Batman Begins", year: "2000", genres: "Horror" }, { title: "The Sunset Limited", year: "2011", genres: "Drama" });
// m.close();


// var m = new MysqlObject("localhost", "root", "0f6fNF9D5Mqf0KTW", "lamp_light");
// //m.createNewTable('Example', ['name', 'surname', 'age']);
// m.createNewTable('Example',
//     {
//         name: { type: 'varchar(255)', default: 'not null', auto_increment: false },
//         surname: { type: 'varchar(255)', default: 'not null', auto_increment: false },
//         age: { type: 'int(2)', default: 'not null', auto_increment: true },
//         vehicles: { type: ['car', 'motorcycle', 'truck'], default: 'car' }
//     });
// m.close();

// var m = new MysqlConnector('192.168.21.51', 'root', 'hcet', 'accounting_state_static', 'client_group') ;
// m.get([], {'client_group_id': 44}).then((val) => {
//     console.log(val) ;
// }) ;
// m.close() ;