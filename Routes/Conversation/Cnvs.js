var Express = require('express');
var Tags = require('../Validator.js').Tags;
var router = Express.Router({ caseSensitive: true });
var async = require('async');

router.baseURL = '/Cnvs';

router.get('/', function (req, res) {

   var handler = function (err, cnvs) {
      if (!err) {
         cnvs.forEach((o, i, a) => cnvs[i].lastMessage = cnvs[i].lastMessage ?
          new Date(cnvs[i].lastMessage).getTime() : null);
         res.json(cnvs);
      }
      req.cnn.release();
   }

   if (req.query.owner && req.validator) {
      req.cnn.chkQry('select id, title, ownerId, lastMessage from ' +
       'Conversation where ownerId = ?', parseInt(req.query.owner), handler);
   } else {
      req.cnn.chkQry('select id, title, ownerId, lastMessage from Conversation',
       null, handler);
   }

});

router.post('/', function (req, res) {
   var vld = req.validator;
   var body = req.body;
   var cnn = req.cnn;
   async.waterfall([
      function (cb) {
         if (vld.check("title" in body && body.title, Tags.missingField,
          ["title"], cb) &&
          vld.check(body.title.length <= 80, Tags.badValue, ["title"], cb)) {
            cnn.chkQry('select * from Conversation where title = ?', body.title,
             cb);
         }
      },
      function (existingCnv, fields, cb) {
         if (vld.check(!existingCnv.length, Tags.dupTitle, null, cb)) {
            body.ownerId = req.session.id;
            cnn.chkQry("insert into Conversation set ?", body, cb);
         }
      },
      function (insRes, fields, cb) {
         res.location(router.baseURL + '/' + insRes.insertId).end();
         cb();
      }],
      function () {
         cnn.release();
      });
});

router.put('/:cnvId', function (req, res) {
   var vld = req.validator;
   var body = req.body;
   var cnn = req.cnn;
   var cnvId = req.params.cnvId;

   async.waterfall([
      function (cb) {
         if (vld.check("title" in body && body.title, Tags.missingField,
          ["title"], cb) &&
          vld.check(body.title.length <= 80, Tags.badValue, ["title"], cb)) {
            cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
         }
      },
      function (cnvs, fields, cb) {
         if (vld.check(cnvs.length, Tags.notFound, null, cb) &&
          vld.checkPrsOK(cnvs[0].ownerId, cb)) {
            cnn.chkQry('select * from Conversation where title = ? && id != ?',
             [body.title, cnvId], cb);
          }
      },
      function (sameTtl, fields, cb) {
         if (vld.check(!sameTtl.length, Tags.dupTitle, null, cb)) {
            cnn.chkQry("update Conversation set title = ? where id = ?",
             [body.title, cnvId], cb);
         }
      }],
      function (err) {
         if (!err)
            res.status(200).end();
         req.cnn.release();
      });
});

router.delete('/:cnvId', function (req, res) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;

   async.waterfall([
      function (cb) {
         cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
      },
      function (cnvs, fields, cb) {
         if (vld.check(cnvs.length, Tags.notFound, null, cb) &&
          vld.checkPrsOK(cnvs[0].ownerId, cb))
            cnn.chkQry('delete from Conversation where id = ?', [cnvId], cb);
      }],
      function (err) {
         if (!err)
            res.status(200).end();
         cnn.release();
      });
});

router.get('/:cnvId', function (req, res) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;

   async.waterfall([
      function (cb) {
         if (vld.check(req.session, Tags.noLogin, null, cb))
            cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
      },
      function (cnvs, fields, cb) {
         if (vld.check(cnvs.length, Tags.notFound, null, cb)) {
            cnvs[0].lastMessage = cnvs[0].lastMessage ?
             new Date(cnvs[0].lastMessage).getTime() : null;
            res.json(cnvs[0]);
            cb();
         }
      }],
      function (err) {
         cnn.release();
      });
});

router.get('/:cnvId/Msgs', function (req, res) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;
   var params = [cnvId];
   var query = 'select whenMade, email, content from Conversation c join' +
      ' Message on cnvId = c.id join Person p on prsId = p.id where c.id = ?'

   //Add a datetime clause and paramemter if indicated
   if (req.query.dateTime) {
      query += " and whenMade <= ?";
      params.push(new Date(req.query.dateTime));
   }

   query += ' order by whenMade asc, Message.id asc';

   //Add a limit clause and parameter if indicated.
   if (req.query.num) {
      query += ' limit ?';
      params.push(parseInt(req.query.num));
   }

   async.waterfall([
      function (cb) {  // Check for existence of conversation
         cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
      },
      function (cnvs, fields, cb) { // Get indicated messages
         if (vld.check(cnvs.length, Tags.notFound, null, cb))
            cnn.chkQry(query, params, cb);
      },
      function (msgs, fields, cb) { // Return retrieved messages
         msgs.forEach((o, i, a) =>
            a[i].whenMade = new Date(a[i].whenMade).getTime());
         res.json(msgs);
         cb();
      }],
      function (err) {
         cnn.release();
      });
});

router.post('/:cnvId/Msgs', function (req, res) {
   var vld = req.validator;
   var cnn = req.cnn;
   var cnvId = req.params.cnvId;
   var body = req.body;
   var now;

   async.waterfall([
      function (cb) {
         if (vld.check("content" in body && body.content, Tags.missingField,
          ["content"], cb)) {
            cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
         }
      },
      function (cnvs, fields, cb) {
         if (vld.check(cnvs.length, Tags.notFound, null, cb))
            cnn.chkQry('insert into Message set ?', {
               cnvId: cnvId, prsId: req.session.id,
               whenMade: now = new Date(), content: req.body.content
            },
            cb);
      },
      function (insRes, fields, cb) {
         res.location('/Msgs/' + insRes.insertId).end();
         cnn.chkQry("update Conversation set lastMessage = ? where id = ?",
          [now, cnvId], cb);
      }],
      function (err) {
         cnn.release();
      });
});

module.exports = router;
