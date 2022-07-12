const passport = require('passport')
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const Client = require('../models/Client/get')
const Token  = require('../models/Token')
const User   = require('../models/User/get')


passport.use(new ClientPasswordStrategy(
  function (client_id, client_secret, done) {
    Client.get(client_id).nodeify((err, client) => {
      if (err)
        return done(null, false, {message: err.message})

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
        return done(err)

      if (err)
        return done(err)

      if (token.expires_at) {
        const expirey = new Date(token.expires_at)

        if (expirey < (new Date()).getTime()) {
          return done(Error.Unauthorized({
            message: 'Expired Token',
            code: 'TokenExpired'
          }))
        }
      }

      if (token.token_type !== 'access')
        return done(Error.Unauthorized('Invalid Token'))

      Client.get(token.client).nodeify((err, client) => {
        if (err)
          return done(err)

        User.get(token.user).nodeify(function (err, user) {
          if (err)
            return done(err)

          if (!user || user.deleted_at !== null)
            return done(Error.ResourceNotFound('Unknown User'))

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
