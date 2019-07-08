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

## Connecting to the Server from the Client
To connect to the server and receive data we want, we need to create a new Request Object:
```js
  const url = "http://localhost:8082"; //url to where the server is running, not where the database is stored.
  var request = new Request(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
        },
    mode: "cors", // specify this to enable data to be sent across different ports
    body: dbRequest
  }) ;
  
```

Let's say we want to get data from a database called "media" and a table called "music" on 
our local machine. 

