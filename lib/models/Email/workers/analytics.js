const db = require('../../../utils/db')
const Context = require('../../Context')

const geoip    = require('geoip-lite')
const UAParser = require('ua-parser-js')

const EmailCampaignStats = require('../campaign/stats')



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

const addEvent = async ({ object, event, created_at }) => {
  if ( object.origin === 'mailgun' ) {
    return await handleMailgun(object, event, created_at)
  }
  
  return await handleGmailOUtlook(object, event, created_at)
}


module.exports = {
  addEvent
}