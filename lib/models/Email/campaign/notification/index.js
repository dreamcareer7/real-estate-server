const promisify = require('../../../../utils/promisify')
const redis     = require('../../../../data-service/redis').createClient()

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem          = promisify(redis.zrem.bind(redis))

const { get: getCampaign } = require('../../campaign/get')
const { getByEmail }       = require('../../campaign/email/get')
const { issueForUsers }    = require('../../../Notification/issue')

const { open_debounce_key: debounce_key } = require('./constants')


/*
  We only have recipient's value for mailgun events
*/
const sendNotification = async (event, email_id, recipient = null) => {
  const notification = {}
  const user_ids = []

  try {
    const emailCampaignEmail = await getByEmail(email_id)
    const emailCampaign      = await getCampaign(emailCampaignEmail.campaign)

    const subject = emailCampaign.subject

    notification.subject_class = 'EmailCampaign'
    notification.object_class  = 'EmailCampaignEmail'
    notification.subject = emailCampaignEmail.campaign
    notification.object  = emailCampaignEmail.id
    notification.action  = 'ReactedTo'
    notification.title   = ''
    notification.data    = { event, recipient, subject }
    notification.message = ''

    user_ids.push(emailCampaign.created_by, emailCampaign.from)

  } catch (ex) {

    if ( ex.code === 'ResourceNotFound' ) {
      return
    }

    throw ex
  }

  await promisify(issueForUsers)(notification, Array.from(new Set(user_ids)), {})
}

const sendNotifications = async () => {
  const until = Math.round(Date.now() / 1000)

  const records  = await zrangebyscore(debounce_key, 0, until)

  if ( records.length < 1 ) {
    return
  }

  const promises = []

  for (const record of records) {
    const obj = JSON.parse(record)

    promises.push(sendNotification(obj.event, obj.email_id))
    promises.push(zrem(debounce_key, record))
  }

  await Promise.all(promises)
}


module.exports = {
  sendNotification,
  sendNotifications
}