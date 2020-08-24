const config  = require('../../../../config')
const Context = require('../../../Context')
const promisify = require('../../../../utils/promisify')

const { get: getCampaign } = require('../../campaign/get')
const { getByEmail }       = require('../../campaign/email/get')
const { issueForUsers }    = require('../../../Notification/issue')


/*
  We only have recipient's value for mailgun events
*/
const sendNotification = async (event, email, recipient = null) => {

  Context.log('sendNotification ==>', event, email, recipient)

  const emailCampaignEmail = await getByEmail(email)
  const emailCampaign      = await getCampaign(emailCampaignEmail.campaign)

  let message = `Email campaign ${emailCampaign.subject} has been ${event}.`

  if ( event === config.email_events.clicked && recipient ) {
    message = `Email campaign ${emailCampaign.subject} has been ${event} by ${recipient}.`
  }

  const notification = {}
  notification.subject_class = 'EmailCampaign'
  notification.object_class  = 'EmailCampaignEmail'
  notification.subject = emailCampaignEmail.campaign
  notification.object  = emailCampaignEmail.id
  notification.action  = 'ReactedTo'
  notification.title   = ''
  notification.data    = { event }
  notification.message = message

  const user_ids = Array.from(new Set([emailCampaign.created_by, emailCampaign.from]))
  await promisify(issueForUsers)(notification, user_ids, {})

  Context.log('sendNotification ==>', JSON.stringify(notification), JSON.stringify(user_ids))

  return
}


module.exports = {
  sendNotification
}