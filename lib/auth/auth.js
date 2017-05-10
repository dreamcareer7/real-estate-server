const passport = require('passport')
module.exports = function (app) {
  app.use(passport.initialize())
  require('./oauth2.js')(app, passport)
  require('./strategies.js')(app, passport)

  const upgradeError = Error.create({
    http: 490,
    message: 'Client must be updated',
    code: Client.UPGRADE_REQUIRED
  })

  const authenticate = (req, res, next) => {
    const check = (err, user, info) => {
      if (err)
        return next()

      if (!user)
        return next()

      if (info.client.status === Client.UPGRADE_REQUIRED)
        return res.error(upgradeError)

      if (info.client.status === Client.UPGRADE_AVAILABLE)
        res.header('X-RECHAT-CLIENT-STATUS', Client.UPGRADE_AVAILABLE)

      req.user = user
      req.client = info.client
      req.token_info = info
      process.domain.user = user

      next()
    }

    passport.authenticate(['bearer'], {session: false}, check)(req, res, next)
  }

  app.use(authenticate)

  app.auth = {}

  app.auth.bearer = fn => {
    return (req, res, next) => {
      if (!req.user)
        return res.error(Error.Unauthorized())
      fn(req,res,next)
    }
  }

  app.auth.bearer.middleware = (req, res, next) => {
    if (!req.user)
      return res.error(Error.Unauthorized())

    next()
  }

  app.auth.clientPassword = fn => {
    return (req, res, next) => {
      const check = (err, client, info) => {
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
