const db = require('../../../../utils/db')
const Context = require('../../../Context')
const config = require('../../../../config.js')
const geoip    = require('geoip-lite')
const UAParser = require('ua-parser-js')

const { get: getCampaign } = require('../../campaign/get')

const EmailCampaignStats = require('../stats')
const { email_events }   = require('./constants')
const { isCampaignOlderThanAMonth, isRecipientOwner } = require('./helper')

// const Crypto = require('../../../Crypto')
const promisify = require('../../../../utils/promisify')
const redis = require('../../../../data-service/redis').createClient()
const setnx = promisify(redis.setnx.bind(redis))
const sadd  = promisify(redis.sadd.bind(redis))
// const exists = promisify(redis.exists.bind(redis))



const verifyIp = (ip) => {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
}

const checkForNotification = async (campaign_id, email_event_id) => {
  const emailCampaign = await getCampaign(campaign_id)
  const emailEvents   = await db.select('email/event/get', [email_event_id])

  if ( emailEvents.length === 0 ) {
    return
  }

  if ( await isRecipientOwner(emailCampaign, emailEvents[0].recipient) ) {
    return
  }

  if (isCampaignOlderThanAMonth(emailCampaign.created_at)) {
    return
  }

  // key value is meaningful
  const key_1 = `num_of_opened_event_${campaign_id}`
  await setnx(key_1, emailCampaign.opened)


  const val = JSON.stringify({
    email_event_id,
    current_opened: emailCampaign.opened // redundant data, for future use cases
  })
  
  // key value is meaningful
  const key_2 = `opened_notifications_${campaign_id}`
  await sadd(key_2, val)
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
  const sent_diff = rows[0].sent_diff

  if ( !campaign_id || !email_event_id ) {
    return
  }
  const sec = parseInt(config.email.min_elapsed_sec_to_update_status)
  if ( event === email_events.opened) {
    if (sent_diff <= sec) {
      Context.log(`sending open notification for event id '${email_event_id}' is cancelled`)
      return
    }
    await checkForNotification(campaign_id, email_event_id)
  }

  await EmailCampaignStats.touch(campaign_id)
}

const handleMailgun = async (object, event, created_at) => {
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


  const data = [email, event, created_at, recipient, object.url, ip, client_os, clien_type, device_type, JSON.stringify(location), object.timestamp]

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

  const data = [email, event, created_at, recipient, url, ip, client_os, clien_type, device_type, JSON.stringify(location)]

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
