const config = require('../../../config')
const db = require('../../../utils/db')
const Context = require('../../Context')
const EmailCampaignEmail = require('../campaign/email')


const addEvent = async ({ object, event, created_at }) => {    
  if ( object.origin === 'mailgun' ) {
    /*
      Add migration to email_events table
      url, ip, user_agent, device, geo_locaation, ... (new columns) (geo_locaation, check the open source package)
  
      object: e, // add migration to separate different sources of event (mailgun, gmail, outlook)
    */

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