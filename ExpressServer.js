var appMaker = require("express");
var app = appMaker();

app.use(function (req, res) {
   res.status(200).end('Hello World\n');
});

app.listen(3000);
