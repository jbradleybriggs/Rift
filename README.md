# Rift

## Running the Server
```bash
  node ./lib/RiftServer.js
```
by default this runs on port 8082, to make the server run on another port, specify
the port number in the terminal as an argument:
```bash
  node ./lib/RiftServer.js 9000
```
this will run the server on port 9000.

## Getting data from the database
The first thing we need to do is build a database request; this will allow the server to connect
to whichever host, database and table you need.
```js
  var dbRequest = {
    host: "localhost", //optional, default 'localhost'
    username: "your_db_username", //required
    password: "your_db_password", //required
    db: "the_db_you_are_connecting_to", //required
    table: "the_table_in_the_db", //required
    op: "GET" //or "SET", "DELETE", "SEARCH", //optional, default "GET"
    fields: ['name', 'surname', 'a_field', 'some_other_field'], //the fields you want to get (if this is [], it will get all the fields)
    conditions: {}, //optional
    options: {group_by: 'a_field', order_by: {'name': 'asc', 'a_field': 'desc'}, limit: 100} //optional 
  }
```

## Connecting to the Server from the Client
To connect to the server and get the data we want, we need to create a new Request Object and pass in the dbRequest:
```js
  const url = "http://localhost:8082"; //url to where the server is running, not where the database is stored.
  var request = new Request(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
        },
    mode: "cors", // specify this to enable data to be sent across different ports
    body: JSON.stringify(dbRequest) //send this as a string rather than an object
  }) ;
  
```
Now we simply do a fetch() - Note the fetch method returns a Promise that resolves to the Response. By chaining another Promise we can resolve to the Response parsed as JSON:
```js
  fetch(request) //send request to the server, which connects to the db 
  .then((response) => response.json()) //once we have the response, parse it as json
  .then((result) => { // result is now the 
  }) ;
```

