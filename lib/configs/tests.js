const config = require('./' + process.env.ORIGINAL_NODE_ENV + '.js')
config.slack.enabled = false

config.url = {
  port: 3079
}

module.exports = config
