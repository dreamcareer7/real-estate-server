const { peanar }   = require('../../utils/peanar')
const { addEvent } = require('./campaign/notification/analytics')
const Metric = require('../Metric')

const EmailCampaignEmail = require('./campaign/email')
const Email = require('./get')

const { getByMicrosoftMessageIds, getByGoogleMessageIds } = require('./get')


const addEvents = async function (messageIds, event, origin) {

  let email_ids

  if ( origin === 'outlook' ) {
    email_ids = await getByMicrosoftMessageIds(messageIds)
  }

  if ( origin === 'gmail' ) {
    email_ids = await getByGoogleMessageIds(messageIds)
  }

  Metric.increment('email_events', [origin, event.event])

  const records = await EmailCampaignEmail.getAll(email_ids)

  for (const record of records) {
    const event_obj = {
      object: {
        origin,
        eceid: record.id // eceid ==> email_campaign_email_id
      },
      event,
      created_at: new Date().getTime()
    }
  
    await Email.addEvent(event_obj)
  }

  return messageIds
}


module.exports = {
  addEvents,

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
