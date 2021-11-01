const e = require('express')
const moment = require('moment-timezone')
const config = require('./' + (process.env.ORIGINAL_NODE_ENV || 'development') + '.js')
config.slack.enabled = false

config.url = {
  port: 3079
}

config.calendar = {
  notification_hour: moment().tz('America/Chicago').hour(), // Time of the day at which users will receive calendar notifications
}

if (config.showinghub) {
  config.showinghub.enabled = false
} else {
  config.showinghub = {enabled: false}
}

config.mls = {
  enabled: ['NTREIS']
}

config.email.seamless_delay = '-1 second'
config.email.stat_update_delay = -1

module.exports = config
