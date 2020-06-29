const db = require('../../../utils/db')
const Context = require('../../Context')
const EmailCampaignEmail = require('../campaign/email')


const addEvent = async ({ object, event, created_at }) => {    
  if ( object.origin === 'mailgun' ) {

    const url = null
    const ip  = object['ip']
    const geolocation = object['geolocation'] // { "city": "Dallas", "region": "TX", "country": "US" }
    const clientOs    = object['client-info']['client-os'] // iOS
    const clientName  = object['client-info']['client-name'] // Mobile Safari
    const clienType   = object['client-info']['client-type'] // mobile browser
    const deviceType  = object['client-info']['device-type'] // mobile


    const email     = object.message.headers['message-id']
    const recipient = object.recipient
    
    Context.log(`Adding email event: ${object.origin} ${event} ${recipient} - message-id: ${email}`)

    const { rows } = await db.query.promise('email/event/mailgun_add', [email, event, created_at, recipient, JSON.stringify(object)])
    const { campaign } = rows[0]
  
    if (campaign) {
      return EmailCampaign.touch(campaign)
    }

  } else {

    // Outlook Or Gmail

    const url = object.headersp['Referer'] || null

    const ip  = object.headersp['X-Forwarded-For'] || null
    const geolocation = null

    const userAgent	  = object.headers['User-Agent']
    const clientOs    = null
    const clientName  = null
    const clienType   = null
    const deviceType  = null
 

    const record = await EmailCampaignEmail.get(object.eceid)
    if (!record) { return }

    const email     = record.email
    const recipient = record.email_address

    Context.log(`Adding email event: ${object.origin} ${event} ${recipient} - eceid: ${object.eceid}`)

    const { rows } = await db.query.promise('email/event/rechat_add', [email, event, created_at, recipient, JSON.stringify(object)])
    const { campaign } = rows[0]

    if (campaign) {
      return EmailCampaign.touch(campaign)
    }
  }
}


module.exports = {
  addEvent
}