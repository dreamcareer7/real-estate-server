var passport = require('passport');
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;

passport.use(new ClientPasswordStrategy(
  function (client_id, client_secret, done) {
    Client.get(client_id, function (err, client) {
      if (err)
          return done(null, false, {message:err.message});

      if (!client)
          return done(null, false, {message:'Invalid credentils'});

      if (client.secret != client_secret)
          return done(null, false, {message:'Invalid credentils'});


      return done(null, client);
    });
  }
));

passport.use(new BearerStrategy(
  function (access_token, done) {
    Token.get(access_token, function (err, token) {
      if (err)
        return done(err);

      if (!token)
        return done(null, false);

      if(token.expire_date) {
        var expirey = new Date(token.expire_date);

        if(expirey < (new Date()).getTime()) {
          return done(null, false, { message: 'Token expired' });
        }
      }

      if(token.type !== 'access')
        return done(null, false);

      User.get(token.user_id, function (err, user) {
        if (err)
            return done(err);

        if (!user)
            return done(null, false, { message: 'Unknown user' });

        var info = {
          scope: '*'
        };

        done(null, user, info);
      });
    });
  }
));

module.exports = function () {
};
