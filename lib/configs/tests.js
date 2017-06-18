const config = require('./' + process.env.ORIGINAL_NODE_ENV + '.js')
config.slack.enabled = false

config.url = {
  port: 3079
}

config.email.seamless_delay = '0 second'

module.exports = config
