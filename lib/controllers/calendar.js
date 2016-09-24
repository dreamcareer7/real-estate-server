const config = require('../config.js')
const google = require('googleapis')
const googleAuth = require('google-auth-library')
const async = require('async')

function initCalendar (req, res) {
  const user_id = req.user.id

  Google.getByUser(user_id, function (err, token) {
    if (err) {
      authorize(user_id, res)
    } else {
      // check if token requires refresh
      Task.fetchGoogleEvents(user_id, null, function (err, events) {
        if (err) {
          Google.wipe(user_id, function (err, wipeRes) {
            if (err) {
              return res.error(err)
            }
            authorize(user_id, res)
          })
        } else {
          return res.error(Error.Conflict({
            details: {
              attributes: {
                user: 'Calendar is already connected'
              }
            }
          }))
        }
      })
    }
  })
}

function authorize (user_id, res) {
  const redirectUrl = config.google.redirect_uri

  const auth = new googleAuth()
  const oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret, redirectUrl)

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: config.google.access_type,
    scope: config.google.scopes,
    state: Crypto.encrypt(user_id)
  })

  res.send({
    'data': {
      'url_string': authUrl,
      'type': 'url'
    },
    'code': 'OK'
  })
}

function callback (req, res) {
  const user_id = Crypto.decrypt(req.query.state.replace(/ /g, '+'))
  const redirectUrl = config.google.redirect_uri
  const auth = new googleAuth()
  const oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret, redirectUrl)
  oauth2Client.access_type = config.google.access_type

  oauth2Client.getToken(req.query.code, function (err, token) {
    if (err) {
      return res.error(err)
    } else {
      oauth2Client.credentials = token
      async.auto({
        calendar_id: cb => {
          return Google.addRechatCalendar(oauth2Client, cb)
        },
        saveCalendar: [
          'calendar_id',
          (cb, results) => {
            return Google.create({
              user: user_id,
              access_token: token.access_token,
              refresh_token: token.refresh_token,
              expiry_date: new Date(token.expiry_date).toISOString(),
              calendar_id: results.calendar_id
            }, cb)
          }
        ],
        tasks: [
          'saveCalendar',
          cb => {
            return Task.getForUser(user_id, null, cb)
          }
        ],
        addToCalendar: [
          'tasks',
          (cb, results) => {
            async.map(results.tasks, function (r, cb) {
              Task.addToCalendar(user_id, r.id, Task.toCalendarEvent(r), cb)
            }, cb)
          }
        ],
        token: [
          'addToCalendar',
          cb => {
            return Google.getByUser(user_id, cb)
          }
        ],
        oauth: [
          'token',
          cb => {
            return Google.createOauthForUser(user_id, cb)
          }],
        watch: [
          'oauth',
          (cb, results) => {
            const calendar = google.calendar('v3')

            return calendar.events.watch({
              auth: results.oauth,
              resource: {
                id: user_id,
                type: 'web_hook',
                address: config.google.web_hook
              },
              calendarId: results.token.calendar_id
            }, cb)
          }
        ]
      }, (err) => {
        if (err) {
          res.error(err)
        }
        return res.end()
      })
    }
  })
}

function getNotify (req, res) {
  const resource_id = req.get('x-goog-channel-id')
  Google.getByUser(resource_id, function (err, token) {
    if (err) {
      return res.error(err)
    } else {
      Task.fetchGoogleEvents(token.user, token.sync_token, function (err, events) {
        if (err) {
          return res.error(err)
        } else {
          res.send(events)
          res.end()
        }
      })
    }
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/calendar/init', b(initCalendar))
  app.get('/calendar/callback', callback)
  app.post('/calendar/notifications', getNotify)
}

module.exports = router
