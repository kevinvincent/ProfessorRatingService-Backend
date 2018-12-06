var Express = require('express');
var Tags = require('../Validator.js').Tags;
var router = Express.Router({ caseSensitive: true });
var async = require('async');

router.baseURL = '/Msgs';

router.get('/:msgId', function (req, res) {

   var vld = req.validator;
   var msgId = parseInt(req.params.msgId);
   var cnn = req.cnn;
   var query = 'select whenMade, email, content from Conversation c join' +
    ' Message m on cnvId = c.id join Person p on prsId = p.id where m.id = ?'

   async.waterfall([
      function (cb) {
         if (vld.check(req.session, Tags.noLogin, null, cb))
            cnn.chkQry(query, [msgId], cb);
      },
      function (cnvs, fields, cb) {
         if (vld.check(cnvs.length, Tags.notFound, null, cb)) {
            cnvs[0].whenMade = new Date(cnvs[0].whenMade).getTime();
            res.json(cnvs[0]);
            cb();
         }
      }],
      function (err) {
         cnn.release();
      }
   );
});

module.exports = router;
