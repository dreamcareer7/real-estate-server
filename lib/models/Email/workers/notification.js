const promisify = require('../../../utils/promisify')

const { get: getCampaign } = require('../campaign/get')
const { getByEmail }       = require('../campaign/email/get')
const { issueForUsers }    = require('../../Notification/issue')


const sendNotification = async (email, event) => {

  const emailCampaignEmail = await getByEmail(email)
  const emailCampaign      = await getCampaign(emailCampaignEmail.campaign)

  const notification = {}
  notification.subject_class = 'EmailCampaign'
  notification.object_class  = 'EmailCampaignEmail'
  notification.subject = emailCampaignEmail.campaign
  notification.object  = emailCampaignEmail.id
  notification.action  = 'ReactedTo'
  notification.title   = ''
  notification.data    = { event }
  notification.message = `Email campaign ${emailCampaign.subject} has been ${event}`

  const user_ids = Array.from(new Set([emailCampaign.created_by, emailCampaign.from]))
  await promisify(issueForUsers)(notification, user_ids, {})

  return
}


module.exports = {
  sendNotification
}