var Express = require('express');
var Tags = require('../Validator.js').Tags;
var router = Express.Router({ caseSensitive: true });
var async = require('async');
var mysql = require('mysql');

router.baseURL = '/Prss';

router.get('/', function (req, res) {
   var email;

   if (req.session.isAdmin() && req.query.email)
      email = req.query.email;
   else if (req.session.isAdmin() && !req.query.email)
      email = "__ALL__";
   else if (req.query.email && req.session.email.startsWith(req.query.email))
      email = req.session.email;
   else if (req.query.email && req.query.email !== req.session.email)
      email = null;
   else
      email = req.session.email;

   var handler = function (err, prsArr, fields) {
      res.json(prsArr);
      req.cnn.release();
   };

   if (email === "__ALL__")
      req.cnn.chkQry('select id, email from Person', handler);
   else if (email)
      req.cnn.chkQry('select id, email from Person WHERE email LIKE ?', [email +
       "%"], handler);
   else
      handler(null, []);

});

router.post('/', function (req, res) {
   var vld = req.validator;  // Shorthands
   var body = req.body;
   var admin = req.session && req.session.isAdmin();
   var cnn = req.cnn;

   if (admin && !body.password) {
      body.password = "*";  // Blocking password
   }
   body.whenRegistered = new Date();

   async.waterfall([
      function (cb) { // Check properties and search for Email duplicates
         if (vld.hasFields(body, ["email", "lastName", "role"], cb) &&
            vld.chain(body.email, Tags.missingField, ["email"])
             .chain(body.role != null, Tags.missingField, ["role"])
             .chain(body.lastName, Tags.missingField, ["lastName"])
             .check(body.password, Tags.missingField, ["password"], cb) &&
            vld.chain(body.role === 0 || admin, Tags.noPermission)
             .chain(body.termsAccepted || admin, Tags.noTerms)
             .check(body.role >= 0, Tags.badValue, ["role"], cb)) {
            cnn.chkQry('select * from Person where email = ?', body.email, cb);
         }
      },
      function (existingPrss, fields, cb) {  // If no duplicates, insert Person
         if (vld.check(!existingPrss.length, Tags.dupEmail, null, cb)) {
            body.termsAccepted = body.termsAccepted ? new Date() : new Date(0);
            cnn.chkQry('insert into Person SET ?', body, cb);
         }
      },
      function (result, fields, cb) { // Return location of inserted Person
         res.location(router.baseURL + '/' + result.insertId).end();
         cb();
      }],
      function (err) {
         cnn.release();
      });
});

router.put('/:id', function (req, res) {
   console.log("Put start")
   var vld = req.validator;  // Shorthands
   var body = req.body;
   var cnn = req.cnn;
   var id = parseInt(req.params.id)
   var admin = req.session && req.session.isAdmin();

   async.waterfall([
      function (cb) { // Check properties and search for Email duplicates
         Object.keys(body).forEach(key => {
            if (key != "firstName" && key != "lastName" && key != "password" &&
             key != "role" && key != "oldPassword") {
               vld.chain(false, Tags.forbiddenField, [key])
            }
         });
         if (vld.checkPrsOK(id, cb) &&
          vld.chain("password" in body ? body.password : true,
           Tags.badValue, ["password"])
          .chain("password" in body ? ("oldPassword" in body &&
           body.oldPassword || admin) : true, Tags.noOldPwd)
          .check("role" in body ? admin : true, Tags.badValue, ['role'],
           cb)) {
            cnn.chkQry("select * from Person where id = ?", [id], cb);
         }
      },
      function (prs, fields, cb) {  // If no duplicates, insert new Person
         if (vld.check(prs.length, Tags.notFound, null, cb) &&
            vld.check(admin || !("password" in req.body) ||
             prs[0].password === req.body.oldPassword, Tags.oldPwdMismatch,
             null, cb)) {
            delete body.oldPassword;
            if (Object.keys(body).length != 0)
               cnn.chkQry("update Person set ? where id = ?", [body, id], cb);
            else
               cb(null, null, null);
         }
      },
      function (result, fields, cb) {
         res.status(200).end();
         console.log("Put end")
         cb();
      }],
      function (err) {
         cnn.release();
      });
});

router.get('/:id', function (req, res) {
   var vld = req.validator;
   if (vld.checkPrsOK(req.params.id)) {
      req.cnn.query('select * from Person where id = ?', [req.params.id],
         function (err, prsArr) {
            if (vld.check(prsArr.length, Tags.notFound)) {
             prsArr[0].termsAccepted =
              new Date(prsArr[0].termsAccepted).getTime();
             prsArr[0].whenRegistered =
              new Date(prsArr[0].whenRegistered).getTime();
               delete prsArr[0].password;
               res.json(prsArr);
            }
            req.cnn.release();
         });
   }
   else {
      req.cnn.release();
   }
});

router.delete('/:id', function (req, res) {
   var vld = req.validator;

   if (vld.checkAdmin()) {
      req.cnn.query('DELETE from Person where id = ?', [req.params.id],
         function (err, result) {
            if (!err && vld.check(result.affectedRows, Tags.notFound, null))
               res.status(200).end();
            else {
               res.status(500).end();
            }
            req.cnn.release();
         }
      );
   }
   else {
      req.cnn.release();
   }
});

module.exports = router;
