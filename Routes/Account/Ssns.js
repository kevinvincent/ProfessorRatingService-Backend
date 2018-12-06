var Express = require('express');
var Tags = require('../Validator.js').Tags;
var ssnUtil = require('../Session.js');
var router = Express.Router({ caseSensitive: true });

router.baseURL = '/Ssns';

router.get('/', function (req, res) {
   var body = [], ssn;

   if (req.validator.checkAdmin()) {
      for (var cookie in ssnUtil.sessions) {
         ssn = ssnUtil.sessions[cookie];
         body.push({ cookie: cookie, prsId: ssn.id, loginTime: ssn.loginTime });
      }
      res.status(200).json(body);
   }

   req.cnn.release();
});

router.post('/', function (req, res) {
   var cookie;
   var cnn = req.cnn;
   cnn.query('select * from Person where email = ?', [req.body.email],
      function (err, result) {
         if (req.validator.check(result.length && result[0].password ===
          req.body.password, Tags.badLogin)) {
            cookie = ssnUtil.makeSession(result[0], res);
            res.cookie('CHSAuth', cookie, { maxAge: 7200000, httpOnly: true });
            res.location(router.baseURL + '/' + cookie).status(200).end();
            res.status(200).end();
         }
         else {
            res.status(401).end();
         }
      });
   req.cnn.release();
});

router.delete('/:cookie', function (req, res) {
   console.log("LOGOUT")
   var admin = req.session && req.session.isAdmin();
   if (req.validator.check(req.params.cookie === req.cookies[ssnUtil.cookieName]
    || admin,
    Tags.noPermission)) {
      ssnUtil.deleteSession(req.params.cookie);
      res.status(200).end();
   }
   req.cnn.release();
});

router.get('/:cookie', function (req, res) {
   var cookie = req.params.cookie;
   var vld = req.validator;

   if (vld.checkPrsOK(ssnUtil.sessions[cookie].id)) {
      res.json({
         prsId: ssnUtil.sessions[cookie].id,
         loginTime: ssnUtil.sessions[cookie].loginTime,
         cookie: cookie
      });
   }
   req.cnn.release();
});

module.exports = router;
