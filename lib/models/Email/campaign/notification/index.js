// const { fastFilter } = require('../../../Contact/fast_filter')
const promisify = require('../../../../utils/promisify')
const redis     = require('../../../../data-service/redis').createClient()

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem = promisify(redis.zrem.bind(redis))
const get = promisify(redis.get.bind(redis))
const del = promisify(redis.del.bind(redis))

const { get: getCampaign } = require('../../campaign/get')
const { getByEmail }       = require('../../campaign/email/get')
const { issueForUsers }    = require('../../../Notification/issue')

const { open_debounce_key: debounce_key } = require('./constants')


/*
  We only have recipient's value for mailgun events
*/
const sendNotification = async ({ event, eventNum, campaign_id, email_id, recipient }) => {
  const notification = {}
  const user_ids = []

  try {
    const emailCampaign = await getCampaign(campaign_id)
    const subject = emailCampaign.subject

    // opened events
    notification.subject_class = 'EmailCampaign'
    notification.subject = emailCampaign.id
    notification.action  = 'ReactedTo'
    notification.title   = ''
    notification.data    = { action: 'opened', subject, eventNum }
    notification.message = ''


    if ( event === 'clicked' ) {
      // if (recipient) {
      //   const result = await fastFilter(emailCampaign.brand, [], { email: recipient })
      // }

      const emailCampaignEmail = await getByEmail(email_id)

      notification.subject_class  = 'EmailCampaign'
      notification.subject        = emailCampaignEmail.id
      notification.object_class   = 'EmailCampaignEmail'
      notification.object         = emailCampaignEmail.id
      notification.data.action    = 'clicked in'
      notification.data.recipient = recipient
    }


    user_ids.push(emailCampaign.created_by, emailCampaign.from)

  } catch (ex) {

    if ( ex.code === 'ResourceNotFound' ) {
      return
    }

    throw ex
  }

  await promisify(issueForUsers)(notification, Array.from(new Set(user_ids)), {})
}

const processNotification = async (record) => {
  const obj = JSON.parse(record)

  const eventNum = await get(record)

  const event       = obj.event
  const campaign_id = obj.campaign_id
  const email_id    = null
  const recipient   = null

  await sendNotification({ event, eventNum, campaign_id, email_id, recipient })
  await zrem(debounce_key, record)
  await del(record)
}

const sendNotifications = async () => {
  const until = Math.round(Date.now() / 1000)

  const records  = await zrangebyscore(debounce_key, 0, until)

  if ( records.length < 1 ) {
    return
  }

  const promises = []

  for (const record of records) {
    promises.push(processNotification(record))
  }

  await Promise.all(promises)
}


module.exports = {
  sendNotification,
  sendNotifications
}