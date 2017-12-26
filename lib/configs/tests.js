const config = require('./' + process.env.ORIGINAL_NODE_ENV + '.js')
config.slack.enabled = false

config.url = {
  port: 3079
}

config.pg = {
  connection: 'postgres://rechat:123456@127.0.0.1/rechat-test'
}

config.email.seamless_delay = '-1 second'

module.exports = config
