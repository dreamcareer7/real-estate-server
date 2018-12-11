const request = require('request')
const config = require('../config.js')

class Slack {
  static send(options, cb) {
    if (!config.slack.enabled) {
      if (cb)
        return cb()

      return
    }

    const payload = {
      channel: '#' + options.channel,
      username: config.slack.name,
      icon_emoji: options.emoji,
      text: options.text
    }

    if (Array.isArray(options.attachments)) {
      payload.attachments = options.attachments
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
}

global['Slack'] = Slack

module.exports = Slack
