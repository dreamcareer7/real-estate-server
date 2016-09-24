const google = require('googleapis')
const googleAuth = require('google-auth-library')
const config = require('../config.js')

const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const sql_insert = require('../sql/google_token/insert.sql')
const sql_update = require('../sql/google_token/update.sql')
const sql_update_sync_token = require('../sql/google_token/update_sync_token.sql')
const sql_get = require('../sql/google_token/get.sql')
const sql_get_by_calendar_id = require('../sql/google_token/get_by_calendar_id.sql')
const sql_wipe_google = require('../sql/google_token/wipe.sql')

Google = {}

const schema = {
  type: 'object',
  properties: {
    user: {
      type: 'string',
      required: true
    },

    access_token: {
      type: 'string',
      required: true
    },

    refresh_token: {
      type: 'string',
      required: true
    },

    expiry_date: {
      type: 'string',
      required: true
    },

    calendar_id: {
      type: 'string',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

Google.create = function (google_token, cb) {
  validate(google_token, function (err) {
    if (err)
      return cb(err)

    return db.query(sql_insert, [
      google_token.user,
      google_token.access_token,
      google_token.refresh_token,
      google_token.expiry_date,
      google_token.calendar_id
    ], cb)
  })
}

Google.update = function (id, google_token, cb) {
  db.query(sql_update, [
    google_token.access_token,
    google_token.refresh_token,
    google_token.expiry_date,
    id
  ], cb)
}

Google.getByUser = function (user_id, cb) {
  db.query(sql_get, [user_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Token not found.'))
    return cb(null, res.rows[0])
  })
}

Google.createOauthForUser = function (user_id, cb) {
  const redirectUrl = config.google.redirect_uri

  const auth = new googleAuth()
  const oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret, redirectUrl)

  Google.getByUser(user_id, function (err, token) {
    if (err) {
      return cb()
    } else {
      oauth2Client.credentials.access_token = token.access_token
      oauth2Client.credentials.refresh_token = token.refresh_token
      oauth2Client.credentials.expiry_date = token.expiry_date
      oauth2Client.calendar_id = token.calendar_id
      oauth2Client.state = Crypto.encrypt(user_id)
      return cb(null, oauth2Client)
    }
  })
}

Google.getByCalendarId = function (calendar_id, cb) {
  db.query(sql_get_by_calendar_id, [calendar_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Token not found.'))

    return cb(null, res.rows[0])
  })
}

Google.addRechatCalendar = function (auth, cb) {
  const calendar = google.calendar('v3')
  calendar.calendars.insert({
    auth: auth,
    resource: {summary: 'Rechat'}
  }, function (err, cal) {
    if (err)
      return cb(err)

    return cb(null, cal.id)
  })
}

Google.updateSyncToken = function (user_id, sync_token, cb) {
  db.query(sql_update_sync_token, [
    user_id,
    sync_token
  ], cb)
}

Google.wipe = function (user_id, cb) {
  db.query(sql_wipe_google, [
    user_id
  ], cb)
}

module.exports = function () {

}
