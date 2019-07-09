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
        console.log("\t[QUERY]: " + this.chalk.rgb(15, 160, 24)(sql));
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
        return `\n\t\t WHERE ${this.__getConcatClause(conditions, '\n\t\t AND ')}`;
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
        var result = '\n\t\t WHERE ';
        for (var field in conditions) {
            result += `\`${field}\` LIKE "${conditions[field]}"\n\t\t OR `;
        }
        result = result.slice(0, result.lastIndexOf("\n\t\t OR "));
        return result;
    }

    __getOrderByFields(fields) {
        /*
            fields must be: 
                an object {name: asc, surname: asc, age: desc} => this will output ORDER BY `name` ASC, `surname` ASC, `age` DESC
        */

        var result = "" ;
        // console.table(fields) ;
        if (Object.keys(fields).length == 0) { //an array
            
            result = this.__getFieldsClause(fields) ;
        }
        else {
            for (var field in fields) {
                result += `${field} ` ;
                if (fields[field].toLowerCase() == 'asc') result += 'ASC' ;
                else if (fields[field].toLowerCase() == 'desc') result += 'DESC' ;
                result += ", " ;
            }
            result = result.slice(0, result.lastIndexOf(", ")); 
        }
        return result ;
    }

    __getOptionsClause(options) {
        if (!options && (typeof options != 'string' || typeof options != 'object')) return "";
        var opts = "" ;
        for (var field in options) {
            if (field.toLowerCase().includes('order') && options[field]) {
                if (typeof options[field] == 'string')
                    opts += `\n\t\t ORDER BY ${options[field]} ` ;
                else opts += `\n\t\t ORDER BY ${this.__getOrderByFields(options[field])} `;
            }
            else if (field.toLowerCase().includes('group') && options[field]) {
                if (typeof options[field] == 'string')
                    opts += `\n\t\t GROUP BY ${options[field]} ` ;
                else opts += `\n\t\t GROUP BY ${this.__getFieldsClause(options[field])} `;
            }
            else if (field.toLowerCase().includes('limit') && options[field]) {
                opts += `\n\t\t LIMIT ${options[field]}`;
            }
        }
        return opts ;
    }

    __getInnerJoinClause(joinConditions) {
        var result = "" ;
        if (joinConditions) {
            var onTable = this.tableName ;
            for (var table in joinConditions) {
                result += `\n\t\t INNER JOIN ${table} ON ${onTable}.${joinConditions[table]} = ${table}.${joinConditions[table]} ` ;
                onTable = table;
            }
        }
        return result ;
    }

 
    /**
     * Gets data by doing inner join(s).
     * 
     * Usage: getInnerJoin(['id', 'name', 'surname'], {table2: 'id', table3: 'idNew'}).then((res) => console.log(res)); //does 2 inner joins, the first matches on id and the second matches on idNew.
     * 
     * @param {Array} fields 
     * @param {Object} joinConditions 
     * @param {Object} options 
     */
    async getInnerJoin(fields=[], joinConditions={}, options={}) {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        var sql = `SELECT ${this.__getFieldsClause(fields)}\n\t\t FROM ${this.tableName} ${this.__getInnerJoinClause(joinConditions)} ${this.__getOptionsClause(options)}` ;
        return this.query(sql) ;
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
     * Usage with options: get([], {}, {group: "type", order: {surname: "asc", age: "desc"}, limit: 50}).then((res) => {console.log(res)}); // gets the first 50 items grouped together by type and then sorted by ascending surname, youngest to oldest
     * Note* Be sure to use the "group" option before you use the "order" option 
     * 
     * @param {Array} fields 
     * @param {Object} conditions 
     */
    async get(fields = [], conditions = {}, options={}) {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        var sql = `SELECT ${this.__getFieldsClause(fields)}\n\t\t FROM ${this.tableName} ${this.__getWhereClause(conditions)} ${this.__getOptionsClause(options)}`;
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
                sql += `\n\t\t\t\`${field}\`, `;
                if (values[field] != undefined && typeof (values[field]) == 'string' && values[field].includes("UNHEX('")) sqlValues += `${values[field]}, `;
                else sqlValues += `\n\t\t\t "${values[field]}", `;
            }
            sql = sql.slice(0, sql.lastIndexOf(', '));
            sqlValues = sqlValues.slice(0, sqlValues.lastIndexOf(', '));
            sql += `)\n\t\t VALUES ( ${sqlValues})`;
        }
        else var sql = `UPDATE ${this.tableName}\n\t\t SET ${this.__getConcatClause(values, ',\n\t\t     ')} ${this.__getWhereClause(conditions)}`;
        return this.query(sql);
    }

    /**
     * Deletes data from the table.
     * 
     * Usage: delete({id: 90210}).then((res) => {console.log(res)}) ; //this will delete a row with the id of 90210.
     * **WARNING** Running this function without specifying the conditions parameter, will result
     * in the following query being run: 'DELETE FROM table' - This will delete EVERYTHING in the table. Be careful!
     * @param {Object} conditions WHERE conditions required when deleting data.
     */
    async delete(conditions = {}) {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        var sql = `DELETE FROM ${this.tableName} ${this.__getWhereClause(conditions)}`;
        return this.query(sql);
    }

    async search(fields, conditions = {}, options={}) {
        if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
        var sql = `SELECT ${this.__getFieldsClause(fields)}\n\t\t FROM ${this.tableName} ${this.__getLikeClause(conditions)} ${this.__getOptionsClause(options)}`;
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

    __resolveRelativePath(relativePath) {
        // example path: ..\..\somewhereElse\newTempFile
        // ../temp/newTempFile

        var os = process.platform ;
        var absPath = process.argv[1] ; // absolute file path of file run with node (should be ....../RiftServer.js)
        var delim = "" ;
        console.log("[ABS]  " + absPath) ;
        //get the directory we are currently running in: (without last slash)
        if (os == 'win32') delim = "\\" ; 
        else if (os == 'linux' || os == 'darwin') delim = "/" ;

        function up() {
            absPath = absPath.slice(0, absPath.lastIndexOf(delim)) ;
        }

        function into(folder) {
            absPath += folder ;
        }

        //absPath = absPath.slice(0, absPath.lastIndexOf(delim)) ;
        up() ;
        while (relativePath.length > 0) {
            var slash = relativePath.indexOf(delim) ;
            if (slash != -1) {
                var action = relativePath.slice(0, slash) ;
                if (action == '..') {
                    //move up one level
                    up() ;
                    
                    relativePath = relativePath.slice(slash+1) ;
                }
                else if (action == '.') {
                    //in this directory
                    absPath += relativePath.slice(slash) ;
                    relativePath = "" ;
                }
                else {
                    into(delim+action) ;
                    relativePath = relativePath.substr(slash+1) ;
                }
            }
            else { //no slash
                into(`${delim}${relativePath}`) ;
                relativePath = "" ;
            }
            // console.log("=>" + absPath) ;
            // console.log("|=>" + relativePath) ;
        }
        return absPath ;
    }

    __createHash(length=30) {
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" ;
        var i = 0 ;
        var result = "" ;
        while (i < length) {
            var index = Math.floor(Math.random() * (alphabet.length-1)) ;
            result += alphabet.charAt(index) ;
            i++ ;
        }
        return result ;
    }

    async __createTempFile(fileName="", fileType=".bin", bufferedData=[]) {
        var serverPath = process.argv[1] ;
        return new Promise((resolve, reject) => {
            var fs = require('fs') ;
            var tempDir = this.__resolveRelativePath('../temp/') ;
            fs.mkdirSync(tempDir) ;
            if (!fileName || fileName == "")
                var temp = this.__resolveRelativePath(`../temp/${this.__createHash()}${fileType}`) ;
            else var temp = this.__resolveRelativePath(`../temp/${fileName}${fileType}`) ;
            //fs.open(temp) ;
            return fs.appendFile(temp, bufferedData, (err) => {
                if (err) this.__throwError(err);
            }) ;
        });
    }

    // async getCreateResource(fields=[], conditions={}, ) {
    //     if (!this.tableName || this.tableName == '') { this.__throwError("Table not specified"); return; }
    //     /*
    //         fields=['name', 'photo', 'photo2'],
    //         conditions={'name': 'Bob Hoskins'},

    //     */
    //     this.get(fields, conditions).then((results) => {
    //         // returns an array of rows: 
    //         /*
    //             [
    //                 {
    //                     key: blob,
    //                     key2: blob
    //                 },
    //                 {
    //                     key: blob,
    //                     key2: blob
    //                 }
    //             ]
    //         */
            
    //     }) ;
    // }

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