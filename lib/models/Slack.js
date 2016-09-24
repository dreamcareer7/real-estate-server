const request = require('request')
const config = require('../config.js')

Slack = {}

Slack.send = function (options, cb) {
  if (!config.slack.enabled) {
    if (cb)
      cb()

    return
  }

  const payload = {
    channel: '#' + options.channel,
    username: config.slack.name,
    icon_emoji: options.emoji,
    text: options.text
  }

  const headers = {}

  const body = {
    url: config.slack.webhook,
    method: 'POST',
    headers: headers,
    form: {
      payload: JSON.stringify(payload)
    }
  }

  request.post(body, cb)
}
