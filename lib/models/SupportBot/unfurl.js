const _ = require('lodash')

const { get } = require('./deal')
const { getAttachments } = require('./get_deal')
const { callMethodJson } = require('./slack_web_api')

async function command(payload) {
  const link = payload.event.links[0].url
  const ts = payload.event.message_ts
  const channel = payload.event.channel
  let deal_id

  const DEAL_PREFIX = 'https://rechat.com/dashboard/deals/'
  if (_.startsWith(link, DEAL_PREFIX)) {
    deal_id = link.substring(DEAL_PREFIX.length, DEAL_PREFIX.length + 36)
    if (deal_id.length < 36) {
      return
    }
  }

  try {
    const deal = await get(deal_id)
    const attachments = await getAttachments(deal)
    const msg = attachments[0]

    msg.callback_id = 'Deal:' + deal_id

    await callMethodJson('chat.unfurl', {
      channel,
      ts,
      unfurls: {
        [link]: msg
      }
    })
  }
  catch (ex) {
    console.error(ex)
  }
}

module.exports = {
  command
}