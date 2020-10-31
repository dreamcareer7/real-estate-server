const db = require('../../../../utils/db')
const Context = require('../../../Context')

const geoip    = require('geoip-lite')
const UAParser = require('ua-parser-js')

const EmailCampaignStats = require('../stats')
const { email_events }   = require('./constants')
const Crypto    = require('../../../Crypto')
const promisify = require('../../../../utils/promisify')
const redis  = require('../../../../data-service/redis').createClient()
const sadd   = promisify(redis.sadd.bind(redis))
const set    = promisify(redis.set.bind(redis))
const exists = promisify(redis.exists.bind(redis))



const verifyIp = (ip) => {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
}

const touch = async (rows, event) => {
  if ( rows.length === 0 ) {
    return
  }

  /*
    [{ 
      "email_event_id": uuid,
      "campaign_id": uui
    }]
  */

  const campaign_id    = rows[0].campaign_id
  const email_event_id = rows[0].email_event_id

  if ( !campaign_id || !email_event_id ) {
    return
  }

  const records = await db.select('email/event/get', [email_event_id])
  const createdEvent = records[0]

  const eventHash = Crypto.encrypt(JSON.stringify({
    'event': createdEvent.event,
    'origin': createdEvent.origin,
    'message': createdEvent.message,
    'recipient': createdEvent.recipient,
    'client-info': createdEvent['client-info']
  }))

  const key = `emailNotif:${eventHash}`

  const duplicateEvent = await exists(key) // true if there is at least one open event.

  if (!duplicateEvent) {
    set(key, '1', 'EX', 5) // expire in 5 seconds
  }

  if ( event === email_events.opened && !duplicateEvent ) {
    const key = `opened_notifications_${campaign_id}`

    /*
     * sadd key event_1 event_2 event_3 ...
     * ttl: 1 Day ???
     */
    await sadd(key, email_event_id) 
  }

  const campaign = rows[0].campaign_id

  if (campaign) {
    await EmailCampaignStats.touch(campaign)
  }
}

const handleMailgun = async (object, event, created_at) => {
  const url = null
  const ip  = object['ip'] || null
  const location    = object['geolocation'] // { "city": "Dallas", "region": "TX", "country": "US" }
  const client_os   = object['client-info'] ? object['client-info']['client-os'] : null // iOS
  const clien_type  = object['client-info'] ? object['client-info']['client-type'] : null // mobile browser
  
  let device_type = object['client-info'] ? object['client-info']['device-type'] : null // mobile
  if ( device_type === 'unknown' ) {
    device_type = null
  }

  const email     = (object.message && object.message.headers) ? object.message.headers['message-id'] : null
  const recipient = object.recipient

  if (!email) {
    return
  }

  Context.log(`Adding email event: ${object.origin} ${event} ${recipient} - message-id: ${email}`)

  const data = [email, event, created_at, recipient, url, ip, client_os, clien_type, device_type, JSON.stringify(location), JSON.stringify(object)]

  const { rows } = await db.query.promise('email/event/mailgun_add', data)

  await touch(rows, event)
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

  const client_os  = ua.os.name || null
  const clien_type = ua.browser.name || null
  
  let device_type = ua.device.type ? ua.device.type : null // console, mobile, tablet, smarttv, wearable, embedded
  if ( device_type === 'unknown' ) {
    device_type = null
  }

  const email     = object.email
  const recipient = null

  Context.log(`Adding email event: ${object.origin} ${event} - email: ${email}`)

  const data = [email, event, created_at, recipient, url, ip, client_os, clien_type, device_type, JSON.stringify(location), JSON.stringify(object)]

  const { rows } = await db.query.promise('email/event/rechat_add', data)

  await touch(rows, event)
}

const handleEvents = async (object, event, created_at) => {
  if ( object.origin === 'mailgun' ) {
    return await handleMailgun(object, event, created_at)
  }

  return await handleGmailOUtlook(object, event, created_at)
}


module.exports = {
  handleEvents
}