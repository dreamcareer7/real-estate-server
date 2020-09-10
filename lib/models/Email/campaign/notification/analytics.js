const db = require('../../../../utils/db')
const Context = require('../../../Context')

const geoip    = require('geoip-lite')
const UAParser = require('ua-parser-js')

const EmailCampaignStats   = require('../stats')
const { getByMailgunId }   = require('../../get')
const { get: getCampaign } = require('../../campaign/get')
const { getByEmail }       = require('../../campaign/email/get')
const { sendNotification } = require('./')
const { getCampaignRecipientsNum } = require('../../campaign/get')

const { open_debounce_key, open_process_delay, email_events } = require('./constants')
const reactedToEvents = [email_events.clicked, email_events.opened]


const verifyIp = function (ip) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
}

const handleMailgunEvent = async (object, event, created_at) => {
  const url = null
  const ip  = object['ip'] || null
  const location   = object['geolocation'] // { "city": "Dallas", "region": "TX", "country": "US" }
  const clientOs   = object['client-info'] ? object['client-info']['client-os'] : null // iOS
  const clienType  = object['client-info'] ? object['client-info']['client-type'] : null // mobile browser
  
  let deviceType = object['client-info'] ? object['client-info']['device-type'] : null // mobile
  if ( deviceType === 'unknown' ) {
    deviceType = null
  }

  const email     = (object.message && object.message.headers) ? object.message.headers['message-id'] : null
  const recipient = object.recipient
  
  if (!email) {
    return
  }

  Context.log(`Adding email event: ${object.origin} ${event} ${recipient} - message-id: ${email}`)

  const data = [email, event, created_at, recipient, url, ip, clientOs, clienType, deviceType, JSON.stringify(location), JSON.stringify(object)]

  const { rows } = await db.query.promise('email/event/mailgun_add', data)
  const { campaign } = rows[0]

  if (campaign) {
    EmailCampaignStats.touch(campaign)
  }
}

const handleGmailOUtlookEvent = async (object, event, created_at) => {
  const url = object.headers['Referer'] || object.headers['referer'] || null
  const ip  = object.headers['X-Forwarded-For'] || object.headers['x-forwarded-for'] || null

  let location = {}

  if (verifyIp(ip)) {
    const geo = geoip.lookup(ip)

    location = {
      city: geo.city,
      region: geo.region,
      country: geo.country
    }
  }
  
  const ua = UAParser(object.headers['User-Agent'] || object.headers['user-agent'])

  const clientOs   = ua.os.name || null
  const clienType  = ua.browser.name || null
  
  let deviceType = ua.device.type ? ua.device.type : null // console, mobile, tablet, smarttv, wearable, embedded
  if ( deviceType === 'unknown' ) {
    deviceType = null
  }

  const email     = object.email
  const recipient = null

  Context.log(`Adding email event: ${object.origin} ${event} - email: ${email}`)

  const data = [email, event, created_at, recipient, url, ip, clientOs, clienType, deviceType, JSON.stringify(location), JSON.stringify(object)]

  const { rows } = await db.query.promise('email/event/rechat_add', data)
  const { campaign } = rows[0]

  if (campaign) {
    EmailCampaignStats.touch(campaign)
  }
}

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

const handleEmailNotification = async (object, event) => {
  const recipient = object.recipient
  const origin    = object.origin
  const email     = (origin === 'mailgun') ? ((object.message && object.message.headers) ? object.message.headers['message-id'] : null) : object.email

  if (!email) {
    return
  }


  let email_id = email

  if ( origin === 'mailgun' ) {
    email_id = await getByMailgunId(email)
  }

  try {
    const emailCampaignEmail = await getByEmail(email_id)
    const emailCampaign      = await getCampaign(emailCampaignEmail.campaign)

    if (!emailCampaign.notifications_enabled) {
      return
    }

    const recipientsNum = await getCampaignRecipientsNum(emailCampaign.id)

    if ( event === email_events.opened ) {
      await debounceOpenEvents(JSON.stringify({ origin, event, email }), recipientsNum)
    }
  
    if ( event === email_events.clicked ) {
      /*
        We only have object.recipient's value for mailgun events
      */
      await sendNotification(origin, event, email, recipient)
    }

  } catch (ex) {

    if ( ex.code === 'ResourceNotFound' ) {
      return
    }

    throw ex
  }
}

const addEvent = async ({ object, event, created_at }) => {
  if ( reactedToEvents.includes(event) ) {
    await handleEmailNotification(object, event)
  }

  if ( object.origin === 'mailgun' ) {
    return await handleMailgunEvent(object, event, created_at)
  }

  return await handleGmailOUtlookEvent(object, event, created_at)
}


module.exports = {
  addEvent
}