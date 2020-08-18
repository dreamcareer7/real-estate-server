const config    = require('../../../config')
const promisify = require('../../../utils/promisify')

const { getByEmail }    = require('../campaign/email/get')
const { notifyById }    = require('../../Deal/live')
const { issueForUsers } = require('../../Notification/issue')


const sendNotification = async (email, event) => {

  const emailCampaignEmail = await getByEmail(email)

  const notification = {}
  notification.subject_class = 'EmailCampaign'
  notification.object_class  = 'EmailCampaign'
  notification.subject = emailCampaignEmail.campaign
  notification.action  = config.email_events.opened === event ? 'EmailOpened' : 'EmailClicked'
  notification.object  = emailCampaignEmail.campaign
  notification.title   = ''
  notification.data    = {} // counts ???
  notification.message = ''

  // const user_ids = ....
  // await promisify(issueForUsers)(notification, user_ids, {})
  // await notifyById(deal.id)

  return
}


module.exports = {
  sendNotification
}