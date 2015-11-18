var oauth2orize = require('oauth2orize');
var passport = require('passport');
var config = require('../config.js');

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Exchange email & password for access token.
server.exchange(oauth2orize.exchange.password(function (client, email, password, scope, done) {
  User.getByEmail(email, function (err, user) {
    if (err)
      return done(err);

    if (!user)
      return done(null, false);

    User.verifyPassword(user, password, function(err, success) {
      if(err || !success)
        return done(null, false);

      getNewTokens(user, client, function(err, tokens) {
        if(err)
          return done(err);

        var data = { 'expires_in': config.auth.access_token_lifetime, code:'OK' };
        data.data = user;
        User.publicize(data.data);
        done(null, tokens.access.token, tokens.refresh.token, data);
      });
    });
  });
}));

function getNewTokens(user, client, cb) {
  var token = {
    client_id : client.id,
    user_id: user.id,
    expire_date: ((new Date()).getTime() / 1000) + config.auth.access_token_lifetime,
    type:'access'
  }

  Token.create(token, function(err, access) {
    if (err)
      return cb(err);

    token.type = 'refresh';
    delete token.expire_date;

    Token.create(token, function(err, refresh) {
      if(err)
        return cb(err);

      cb(null, {access:access, refresh:refresh});
    });
  });
}

// Exchange refreshToken for access token.
server.exchange(oauth2orize.exchange.refreshToken(function (client, refresh_token, scope, done) {
  Token.get(refresh_token, function (err, token) {
    if (err)
      return done(err);

    if (!token)
      return done(null, false);

    if(token.type !== 'refresh')
      return done(null, false);

    User.get(token.user_id, function (err, user) {
      if (err)
        return done(err);

      if (!user)
        return done(null, false);

      getNewTokens(user, client, function(err, tokens) {
        if(err)
          return done(err);

        done(null, tokens.access.token, tokens.refresh.token, { 'expires_in': config.auth.access_token_lifetime, code:'OK' });
      });
    });
  });
}));

module.exports = function (app, passport) {
  app.post('/oauth2/token', [
    passport.authenticate(['oauth2-client-password'], { session: false }),
    server.token(),
    server.errorHandler()
  ]);
}