// This middleware assumes cookieParser has been "used" before this

var crypto = require('crypto');

var sessions = {};          // All currently logged-in Sessions
var duration = 7200000;     // Two hours in milliseconds
var cookieName = 'CHSAuth'; // Cookie key for authentication tokens

// Session-constructed objects represent an ongoing login session, including
// user details, login time, and time of last use, the latter for the purpose
// of timing-out sessions that have been unused for too long.
var Session = function Session(user) {
   this.firstName = user.firstName;
   this.lastName = user.lastName;
   this.id = user.id;
   this.email = user.email;
   this.role = user.role;

   this.loginTime = new Date().getTime();
   this.lastUsed = new Date().getTime();
};

Session.prototype.isAdmin = function () {
   return this.role == 1;
};

// Export a function that logs in |user| by creating an authToken and sending it
// as a cookie, creating a Session for |user|, and saving it in |sessions| index
// by the authToken.
//
// 1 Cookie is tagged by |cookieName|, times out on the client side after |durat
// (though the router, below, will check anyway to prevent hacking), and will no
// shown by the browser to the user, again to prevent hacking.
exports.makeSession = function makeSession(user, res) {
   var authToken = crypto.randomBytes(16).toString('hex');  // Create random aut
   var session = new Session(user);

   res.cookie(cookieName, authToken, { maxAge: duration, httpOnly: true }); // 1
   sessions[authToken] = session;

   return authToken;
};

// Export a function to log out a user, given an authToken
exports.deleteSession = function (authToken) {
   delete sessions[authToken];
};

// Export a router that will find any Session associated with |req|, based on co
// delete the Session if it has timed out, or attach the Session to |req| if it'
// If |req| has an attached Session after this process, then down-chain routes w
// treat |req| as logged-in.
exports.router = function (req, res, next) {
   // If we present a session cookie that corresponds with one in |sessions|...
   if (req.cookies[cookieName] && sessions[req.cookies[cookieName]]) {
      // If the session was last used more than |duration| mS ago..
      if (sessions[req.cookies[cookieName]].lastUsed <
         new Date().getTime() - duration) {
         delete sessions[req.cookies[cookieName]];
      }
      else {
         req.session = sessions[req.cookies[cookieName]];
      }
   }
   next();
};

exports.cookieName = cookieName;
exports.sessions = sessions;
