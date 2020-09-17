const { get: getCampaign } = require('../../campaign/get')
const { getByMailgunId, get: getEmail }   = require('../../get')
const { sendNotification } = require('./')

const promisify = require('../../../../utils/promisify')
const redis = require('../../../../data-service/redis').createClient()
const zadd  = promisify(redis.zadd.bind(redis))
const pfadd = promisify(redis.pfadd.bind(redis))

const { open_debounce_key, email_events } = require('./constants')


function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x)
}

const debounceOpenEvents = async (val, sent) => {
  const max   = 25000
  const index = ( sent > max ) ? 1 : (sent / max)
  const res   = easeOutQuad(index) * 10000
  const delay = Math.ceil(res)
  const score = Math.round(Date.now() / 1000) + delay

  await zadd(open_debounce_key, score, val)
}

const processNotification = async (object, event, email_id) => {
  const recipient = object.recipient

  const email = await getEmail(email_id)
  const campaign_id = email.campaign

  try {
    const emailCampaign = await getCampaign(campaign_id)

    if (!emailCampaign.notifications_enabled) {
      return
    }

    /*
      We need to digest all of the opened events.
    */
    if ( event === email_events.opened ) {
      const val = JSON.stringify({ event, campaign_id })

      await debounceOpenEvents(val, emailCampaign.sent)

      // It applies only on Mailgun events, counts unique recipients
      if (recipient) {
        await pfadd(val)
      }
    }

    /*
      We don not need to digest clicked events.
      Tip: We only have object.recipient's value for mailgun events.
    */
    if ( event === email_events.clicked ) {
      await sendNotification({ event, eventNum: 1, campaign_id, email_id, recipient })
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