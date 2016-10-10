const config = require('./' + process.env.ORIGINAL_NODE_ENV + '.js')
config.slack.enabled = false
module.exports = config
