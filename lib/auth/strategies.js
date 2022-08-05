const oauth2orize = require('oauth2orize')
const config      = require('../config.js')
const Context     = require('../models/Context')
const Orm         = require('../models/Orm/index')
const User        = require('../models/User')
const Token       = require('../models/Token')

// create OAuth 2.0 server
const server = oauth2orize.createServer()

// Exchange email & password for access token.
server.exchange(oauth2orize.exchange.password((client, email, password, scope, done) => {
  User.getByEmail(email).nodeify(function (err, user) {
    if (err)
      return done(err)

    if (!user || user.deleted_at !== null)
      return done(null, false)

    User.verifyPassword(user, password, (err, success) => {
      if (err || !success)
        return done(null, false)

      getNewTokens(user, client, function (err, tokens) {
        if (err)
          return done(err)

        const data = { 'expires_in': config.auth.access_token_lifetime, code: 'OK' }

        // Set the current user so when publicizing and logging we know who the user is.
        Context.set({user})

        Orm.populate({
          models: [user]
        }).nodeify((err, u) => {
          if (err)
            return done(err)

          data.data = u[0]
          done(null, tokens.access.token, tokens.refresh.token, data)
        })
      })
    })
  })
}))

function getNewTokens (user, client, cb) {
  const token = {
    client_id: client.id,
    user: user.id,
    expires_at: new Date((Number(new Date)) + (config.auth.access_token_lifetime * 1000)),
    token_type: Token.ACCESS
  }

  Token.create(token).nodeify((err, access) => {
    if (err)
      return cb(err)

    token.token_type = Token.REFRESH
    delete token.expires_at

    Token.create(token).nodeify((err, refresh) => {
      if (err)
        return cb(err)

      cb(null, {access, refresh})
    })
  })
}

// Exchange refreshToken for access token.
server.exchange(oauth2orize.exchange.refreshToken((client, refresh_token, scope, done) => {
  Token.get(refresh_token).nodeify((err, token) => {
    if (err && err.code === 'ResourceNotFound')
      return done(null, false)

    if (err)
      return done(err)

    if (token.token_type !== Token.REFRESH)
      return done(null, false)

    User.get(token.user).nodeify(function (err, user) {
      if (err)
        return done(err)

      if (!user)
        return done(null, false)

      getNewTokens(user, client, function (err, tokens) {
        if (err)
          return done(err)

        done(null, tokens.access.token, tokens.refresh.token, { 'expires_in': config.auth.access_token_lifetime, code: 'OK' })
      })
    })
  })
}))

module.exports = function (app, passport) {
  app.post('/oauth2/token', [
    passport.authenticate(['oauth2-client-password'], { session: false }),
    server.token(),
    server.errorHandler(),
  ])
}
