const moment = require('moment-timezone')
const config = require('./' + (process.env.ORIGINAL_NODE_ENV || 'development') + '.js')
config.slack = { ...config.slack, enabled: false }

config.url = {
  port: 3079
}

config.calendar = {
  notification_hour: moment().tz('America/Chicago').hour(), // Time of the day at which users will receive calendar notifications
}

config.showinghub = { ...config.showinghub, enabled: false }

config.mls = {
  enabled: ['NTREIS']
}

config.email = {
  ...config.email,
  seamless_delay: '-1 second',
  stat_update_delay: -1,
  min_elapsed_sec_to_update_status: -1
}

config.buckets = {
  ...config.buckets,
  public: {
    name: 'rechat-public-test',
    region: 'us-test',
    cdn: {
      url: 'https://test.cloudfront.net/'
    }
  }
}
module.exports = config
