const passport = require('passport')
module.exports = function (app) {
  app.use(passport.initialize())
  require('./oauth2.js')(app, passport)
  require('./strategies.js')(app, passport)

  const authenticate = function (req, res, next) {
    const check = function (err, user, info) {
      if (err)
        return next()

      if (!user)
        return next()

      req.user = user
      req.token_info = info
      process.domain.user = user

      next()
    }

    passport.authenticate(['bearer'], {session: false}, check)(req, res, next)
  }

  app.use(authenticate)

  app.auth = {}

  app.auth.optionalBearer = function(fn) {
    return function(req, res, next) {
      fn(req, res, next)
    }
  }

  app.auth.bearer = function (fn) {
    return function (req, res, next) {
      if (!req.user)
        return res.error(Error.Unauthorized())
      fn(req,res,next)
    }
  }

  app.auth.bearer.middleware = function (req, res, next) {
    if (!req.user)
      return res.error(Error.Unauthorized())

    next()
  }

  app.auth.clientPassword = function (fn) {
    return function (req, res, next) {
      const check = function (err, client, info) {
        if (err)
          return res.error(err)

        if (!client)
          return res.error(Error.Unauthorized())

        req.client = client
        return fn(req, res, next)
      }
      passport.authenticate(['oauth2-client-password'], {session: false}, check)(req, res, next)
    }
  }
}
