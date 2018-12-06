var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');

var app = express();

app.use(function(req, res, next) {
   console.log("Starting Express Chain");
   next();
});

app.get('/Test', function(req, res) {  // Next not needed
   console.log("Test GET");
   res.status(200).json({message: "Hi!"});
});

// Parse request body as JSON. (What does json() return??)
app.use(bodyParser.json());

/* Very slow function can tie up server..
app.get('/SlowHit', function(req, res) {
   console.log("SlowHit GET -- busy loop");
   for (var i = 0; i < 100000000; i += Math.random())
      ;
   console.log("Done: " + i);
   res.status(200).json({message: "Finally done!"});
});
*/

/* But a callback leaves it free to do other work meantime
*/
app.get('/SlowHit', function(req, res) {  // Just ignore 'next'
   console.log("SlowHit GET");
   setTimeout(function() {
      console.log("Sending response");
      res.status(200).json({message: "Finally done!"});
   }, 5000);
   console.log("Moving on");
});

// Let's try a registration
app.post('/Prss', function(req, res) {
   var errorList = [];
   var cnnConfig = {
      host     : 'localhost',
      user     : 'cstaley',
      password : 'CASpw',
      database : 'cstaley'
   };

   if (req.body.role !== 0)
      errorList.push({tag: "noPermission"});

   if (req.body.role < 0)
      errorList.push({tag: "badVal", param: "role"});

   // Post errors, or proceed with data fetches
   if (errorList.length)
      res.status(400).json(errorList);
   else {
      var cnn = mysql.createConnection(cnnConfig);

      // Find duplicate Email if any.
      cnn.query('select * from Person where email = ?', req.body.email,
      function(err, dupEmail) {
         if (dupEmail.length) {
            res.status(400).json({tag: "dupEmail"});
            cnn.destroy();
         }
         else { // No duplicate, so make a new Person
            req.body.termsAccepted = req.body.termsAccepted && new Date();
            req.body.whenRegistered = new Date();
            cnn.query('insert into Person set ?', req.body,
            function(err, insRes) {
               console.log(err);
               if (err)
                  res.status(500).json(err);
               else
                  res.location('Prss/' + insRes.insertId).end();
               cnn.destroy();
            });
          }
      });
   }
});

app.use(function(req, res) {
   res.status(404).end();
});

// REPLACE 3000 with your PORT!
app.listen(3000, function () {
   console.log('App Listening on port 3000');
});
