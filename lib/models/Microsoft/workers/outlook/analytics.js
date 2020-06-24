const Email               = require('../../../Email')
const EmailCampaignEmail  = require('../../../Email/campaign/email')



const addEvents = async function (messageIds, event) {
  const emails  = await Email.getByMicrosoftMessageIds(messageIds)
  const records = await EmailCampaignEmail.getByEmails(emails)

  for (const record of records) {
    const eventObj = {
      email: record.email,
      event,
      created_at: new Date().getTime(),
      recipient: record.email_address,
      object: { email_campaign_email_id: record.id }
    }
  
    await Email.addEvent(eventObj)
  }

  return messageIds
}


module.exports = addEvents