const { get: getCampaign } = require('../../campaign/get')
const { getByMailgunId }   = require('../../get')
const { getByEmail }       = require('../../campaign/email/get')
const { sendNotification } = require('./')

const promisify = require('../../../../utils/promisify')
const redis     = require('../../../../data-service/redis').createClient()
const zadd      = promisify(redis.zadd.bind(redis))

const { open_debounce_key, open_process_delay, email_events } = require('./constants')


const debounceOpenEvents = async (val, recipientsNum) => {
  let delay = 0

  switch (recipientsNum) {
    case ( recipientsNum <= 5 ):
      delay = 30
      break

    case ( recipientsNum > 5 && recipientsNum < 50 ):
      delay = 90
      break

    case ( recipientsNum >= 50 ):
      delay = 15 * 60
      break

    default:
      delay = open_process_delay
  }

  const score = Math.round(Date.now() / 1000) + delay

  await zadd(open_debounce_key, score, val)
}

const processNotification = async (object, event, email_id) => {
  const recipient = object.recipient

  try {
    const emailCampaignEmail = await getByEmail(email_id)
    const emailCampaign      = await getCampaign(emailCampaignEmail.campaign)

    if (!emailCampaign.notifications_enabled) {
      return
    }

    /*
      We need to digest all of the opened events.
    */
    if ( event === email_events.opened ) {
      await debounceOpenEvents(JSON.stringify({ event, email_id }), emailCampaign.sent)
    }

    /*
      We don not need to digest clicked events.
      Tip: We only have object.recipient's value for mailgun events.
    */
    if ( event === email_events.clicked ) {
      await sendNotification(event, email_id, recipient)
    }

  } catch (ex) {

    if ( ex.code === 'ResourceNotFound' ) {
      return
    }

    throw ex
  }
}

const handleMailgun = async (object, event) => {
  const message_id = (object.message && object.message.headers) ? object.message.headers['message-id'] : null

  /*
    message_id is the unique id of the relevant sent mailgun email.
  */
  if (!message_id) {
    return
  }

  /*
    email_id is the unique id of the relevant record of emails table.
  */
  const email_id = await getByMailgunId(message_id)

  return await processNotification(object, event, email_id)
}

const handleGmailOutlook = async (object, event) => {
  const email_id = object.email

  /*
    email_id is the unique id of the relevant record of emails table.
  */
  if (!email_id) {
    return
  }

  return await processNotification(object, event, email_id)
}

const handleNotifications = async (object, event) => {
  if ( object.origin === 'mailgun' ) {
    return await handleMailgun(object, event)
  }

  return await handleGmailOutlook(object, event)
}


module.exports = {
  handleNotifications
}