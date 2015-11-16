var passport = require('passport');

module.exports = function(app) {
  app.use(passport.initialize());
  require('./oauth2.js')(app, passport);
  require('./strategies.js')(app, passport);

  app.auth = {};

  var bearer = passport.authenticate(['bearer'], {session:false});

  app.auth.bearer = function(fn) {
    return function(req, res, next) {
      var check = function(err, user, info) {
        if(err)
          return res.error(err);

        if (!user)
          return res.error(Error.Unauthorized());

        req.user = user;
        return fn(req, res, next);
      };
      passport.authenticate(['bearer'], {session:false}, check)(req, res, next);
    };
  };

  app.auth.clientPassword = function(fn) {
    return function(req, res, next) {
      var check = function(err, client, info) {
        if(err)
          return res.error(err);

        if(!client)
          return res.error(Error.Unauthorized());

        req.client = client;
        return fn(req, res, next);
      };
      passport.authenticate(['oauth2-client-password'], {session:false}, check)(req, res, next);
    };
  };
};
