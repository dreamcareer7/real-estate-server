const db = require('../../../../utils/db')
const Context = require('../../../Context')
const config  = require('../../../../config')

const geoip    = require('geoip-lite')
const UAParser = require('ua-parser-js')

const EmailCampaignStats = require('../stats')
const { sendNotification } = require('./worker')


const promisify = require('../../../../utils/promisify')
const redis     = require('../../../../data-service/redis').createClient()
const zadd      = promisify(redis.zadd.bind(redis))

const { OPEN_DEBOUNCE_KEY, OPEN_PROCESS_DELAY } = require('./constants')

const reactedToEvents = [config.email_events.clicked, config.email_events.opened]


const verifyIp = function (ip) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
}

const handleMailgun = async (object, event, created_at) => {
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

  return
}

const handleGmailOUtlook = async (object, event, created_at) => {
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

  return
}

const debounceOpenEvents = async (email) => {
  const score = Math.round(Date.now() / 1000) + OPEN_PROCESS_DELAY
  await zadd(OPEN_DEBOUNCE_KEY, score, email)
}

const handleEmailNotification = async (object, event) => {
  if ( event === config.email_events.opened ) {
    await debounceOpenEvents(object.email)
  }

  if ( event === config.email_events.clicked ) {
    /*
      We only have object.recipient's value for mailgun events
    */
    await sendNotification(event, object.email, object.recipient)
  }
}

const addEvent = async ({ object, event, created_at }) => {
  Context.log('sendNotification ==>', event, JSON.stringify(object))

  if ( object.email && reactedToEvents.includes(event) ) {
    await handleEmailNotification(object, event)
  }

  if ( object.origin === 'mailgun' ) {
    return await handleMailgun(object, event, created_at)
  }

  return await handleGmailOUtlook(object, event, created_at)
}


module.exports = {
  addEvent
}