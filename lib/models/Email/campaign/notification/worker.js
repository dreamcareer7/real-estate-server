const promisify = require('../../../../utils/promisify')

const { get: getCampaign } = require('../../campaign/get')
const { getByEmail }       = require('../../campaign/email/get')
const { issueForUsers }    = require('../../../Notification/issue')
const { getByMailgunId }   = require('../../get')



const send = async (event, recipient, emailCampaignEmail, emailCampaign) => {
  const notification = {}
  notification.subject_class = 'EmailCampaign'
  notification.object_class  = 'EmailCampaignEmail'
  notification.subject = emailCampaignEmail.campaign
  notification.object  = emailCampaignEmail.id
  notification.action  = 'ReactedTo'
  notification.title   = ''
  notification.data    = {
    event,
    recipient,
    subject: emailCampaign.subject
  }
  notification.message = ''

  const user_ids = Array.from(new Set([emailCampaign.created_by, emailCampaign.from]))
  await promisify(issueForUsers)(notification, user_ids, {})
}

const handleEmailRecord = async (origin, email) => {
  if ( origin === 'mailgun' ) {
    return await getByMailgunId(email)
  }

  return email
}


/*
  We only have recipient's value for mailgun events
*/
const sendNotification = async (origin, event, email, recipient = null) => {
  const email_id = await handleEmailRecord(origin, email)

  const emailCampaignEmail = await getByEmail(email_id)
  const emailCampaign      = await getCampaign(emailCampaignEmail.campaign)

  return await send(event, recipient, emailCampaignEmail, emailCampaign)
}


module.exports = {
  sendNotification
}