const db = require('../../utils/db')
const { peanar } = require('../../utils/peanar')

const Context = require('../Context')
const EmailCampaignStats = require('./campaign/stats')

const addEvent = async ({ email, event, created_at, recipient, object }) => {
  Context.log('Adding email event', event, recipient, email)
  const { rows } = await db.query.promise('email/event/add', [
    email,
    event,
    created_at,
    recipient,
    JSON.stringify(object),
  ])

  const { campaign } = rows[0]

  if (campaign) return EmailCampaignStats.touch(campaign)
}

module.exports = {
  addEvent: peanar.job({
    handler: addEvent,
    exchange: 'email_event',
    name: 'email_event',
    queue: 'email_event',
    error_exchange: 'email_event.error',
    max_retries: 10,
    retry_delay: 30000,
    retry_exchange: 'email_event.retry',
  }),
}
