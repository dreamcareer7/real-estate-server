const db = require('../../../utils/db')
const Context = require('../../Context')
const EmailCampaignEmail = require('../campaign/email')

const geoip    = require('geoip-lite')
const UAParser = require('ua-parser-js')



const verifyIp = function (ip) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
}

const addEvent = async ({ object, event, created_at }) => {
  if ( object.origin === 'mailgun' ) {

    const url = null
    const ip  = object['ip'] || null
    const location   = object['geolocation'] // { "city": "Dallas", "region": "TX", "country": "US" }
    const clientOs   = object['client-info'] ? object['client-info']['client-os'] : null // iOS
    const clienType  = object['client-info'] ? object['client-info']['client-type'] : null // mobile browser
    const deviceType = object['client-info'] ? object['client-info']['device-type'] : null // mobile

    const email     = object.message.headers['message-id']
    const recipient = object.recipient
    
    Context.log(`Adding email event: ${object.origin} ${event} ${recipient} - message-id: ${email}`)

    const data = [email, event, created_at, recipient, url, ip, clientOs, clienType, deviceType, JSON.stringify(location), JSON.stringify(object)]

    const { rows } = await db.query.promise('email/event/mailgun_add', data)
    const { campaign } = rows[0]
  
    if (campaign) {
      return EmailCampaign.touch(campaign)
    }

  } else {

    // Outlook Or Gmail

    const url = object.headersp['Referer'] || null
    const ip  = object.headersp['X-Forwarded-For'] || null

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
    const deviceType = ua.device.type || null // console, mobile, tablet, smarttv, wearable, embedded

    const email     = object.email
    const recipient = null // record.email_address

    Context.log(`Adding email event: ${object.origin} ${event} ${recipient} - eceid: ${object.eceid}`)

    const data = [email, event, created_at, recipient, url, ip, clientOs, clienType, deviceType, JSON.stringify(location), JSON.stringify(object)]

    const { rows } = await db.query.promise('email/event/rechat_add', data)
    const { campaign } = rows[0]

    if (campaign) {
      return EmailCampaign.touch(campaign)
    }
  }
}


module.exports = {
  addEvent
}