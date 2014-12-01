var passport = require('passport');

module.exports = function(app) {
  app.use(passport.initialize());
  require('./oauth2.js')(app, passport);
  require('./strategies.js')(app, passport);

  app.auth = {};

  var bearer = passport.authenticate(['bearer'], {session:false})
  var clientPass = passport.authenticate(['oauth2-client-password'], {session:false})


  app.auth.bearer = function(fn) {
    return function(req, res) {
      bearer(req,res,fn.bind(null, req, res));
    }
  }

  app.auth.clientPassword = function(fn) {
    return function(req, res) {
      clientPass(req,res,fn.bind(null, req, res));
    }
  }
}