const { peanar }   = require('../../utils/peanar')
const { addEvent } = require('./workers/analytics')

const EmailCampaignEmail = require('./campaign/email')
const Email = require('./get')

const { getByMicrosoftMessageIds, getByGoogleMessageIds } = require('./get')


const addEvents = async function (messageIds, event, origin) {
  let emails

  if ( origin === 'outlook' ) {
    emails = await getByMicrosoftMessageIds(messageIds)
  }

  if ( origin === 'gmail' ) {
    emails = await getByGoogleMessageIds(messageIds)
  }

  const records = await EmailCampaignEmail.getByEmails(emails)

  for (const record of records) {
    const eventObj = {
      object: {
        origin,
        eceid: record.id // eceid ==> email_campaign_email_id
      },
      event,
      created_at: new Date().getTime()
    }
  
    await Email.addEvent(eventObj)
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