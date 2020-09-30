const db = require('../../../../utils/db')
const Context = require('../../../Context')

const geoip    = require('geoip-lite')
const UAParser = require('ua-parser-js')

const EmailCampaignStats = require('../stats')


const verifyIp = function (ip) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
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
  const { campaign } = rows[0]

  if (campaign) {
    EmailCampaignStats.touch(campaign, event)
  }
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
  const { campaign } = rows[0]

  if (campaign) {
    EmailCampaignStats.touch(campaign, event)
  }
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