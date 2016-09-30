const passport = require('passport')
const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const route_params = ['id', 'rid', 'cid']

module.exports = function (app) {
  app.use(passport.initialize())
  require('./oauth2.js')(app, passport)
  require('./strategies.js')(app, passport)

  app.auth = {}

  app.auth.bearer = function (fn) {
    return function (req, res, next) {
      const check = function (err, user, info) {
        for (const i in route_params) {
          if (req.params[route_params[i]] && !req.params[route_params[i]].match(uuid_regex))
            return res.error(Error.Validation('Invalid UUID reference'))
        }

        if (err)
          return res.error(err)

        if (!user)
          return res.error(Error.Unauthorized())

        req.user = user
        process.domain.user = user
        return fn(req, res, next)
      }

      passport.authenticate(['bearer'], {session: false}, check)(req, res, next)
    }
  }

  app.auth.optionalBearer = function (fn) {
    return function (req, res, next) {
      const check = function (err, user, info) {
        if (err)
          return fn(req, res, next)

        if (!user)
          return fn(req, res, next)

        req.user = user
        process.domain.user = user
        return fn(req, res, next)
      }

      passport.authenticate(['bearer'], {session: false}, check)(req, res, next)
    }
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
