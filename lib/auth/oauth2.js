const passport = require('passport')
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy

passport.use(new ClientPasswordStrategy(
  function (client_id, client_secret, done) {
    Client.get(client_id).nodeify((err, client) => {
      if (err)
        return done(null, false, {message: err.message})

      if (client.status === Client.UPGRADE_REQUIRED)
        return done(null, false, {message: 'Your client is outdated'})

      if (client.secret !== client_secret)
        return done(null, false, {message: 'Invalid credentils'})

      return done(null, client)
    })
  }
))

passport.use(new BearerStrategy(
  function (access_token, done) {
    Token.get(access_token).nodeify((err, token) => {
      if (err && err.code === 'ResourceNotFound')
        return done(null, false)

      if (err)
        return done(err)

      if (token.expires_at) {
        const expirey = new Date(token.expires_at)

        if (expirey < (new Date()).getTime()) {
          return done(null, false, {message: 'Token expired'})
        }
      }

      if (token.token_type !== 'access')
        return done(null, false)

      Client.get(token.client).nodeify((err, client) => {
        if (err)
          return done(err)

        if (client.status === Client.UPGRADE_REQUIRED)
          return done(null, false, {message: 'Your client is outdated'})

        User.get(token.user, function (err, user) {
          if (err)
            return done(err)

          if (!user)
            return done(null, false, {message: 'Unknown user'})

          const info = {
            scope: '*',
            access_token,
            client
          }

          done(null, user, info)
        })
      })
    })
  }
))

module.exports = function () {
}
