var http = require("http");  // Load HTTP module

// Make a server
http.createServer(
   function(request, response) {
      response.writeHead(200, {'Content-Type': 'text/plain'}); // Status code and headers
      response.end('Hello World\n');                           // Set body and send response
   }
).listen(3000);
