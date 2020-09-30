const { fastFilter } = require('../../../Contact/fast_filter')
const { get: getContact } = require('../../../../models/Contact/get')
const promisify = require('../../../../utils/promisify')
const redis     = require('../../../../data-service/redis').createClient()

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem = promisify(redis.zrem.bind(redis))

const { get: getCampaign } = require('../../campaign/get')
const { getByEmail }       = require('../../campaign/email/get')
const { issueForUsers }    = require('../../../Notification/issue')

const { open_debounce_key: debounce_key } = require('./constants')


/*
  We only have recipient's value for mailgun events
*/
const sendNotification = async ({ event, campaign_id, email_id, recipient }) => {
  const notification = {}
  const user_ids = []

  try {
    const emailCampaign = await getCampaign(campaign_id)
    const subject = emailCampaign.subject
    const count   = emailCampaign.opened

    // opened events
    notification.subject = emailCampaign.id
    notification.subject_class = 'EmailCampaign'

    notification.object = emailCampaign.id
    notification.object_class = 'EmailCampaign'

    notification.action  = 'ReactedTo'
    notification.data    = { action: 'opened', subject, count }
    notification.title   = ''
    notification.message = ''

    if ( event === 'clicked' ) {
      let recipientName = null

      if (recipient) {
        try {
          const result = await fastFilter(emailCampaign.brand, [{ attribute_type: 'email', value: recipient, operator: 'any' }], {})

          if ( result.ids.length ) {
            const contact = await getContact(result.ids[0])
          
            if (contact) {
              recipientName = contact.display_name
            }
          }
        } catch (ex) {
          // do nothing
        }
      }

      const emailCampaignEmail = await getByEmail(email_id)

      notification.object         = emailCampaignEmail.id
      notification.object_class   = 'EmailCampaignEmail'
      notification.data.count     = 1
      notification.data.action    = 'clicked'
      notification.data.recipient = recipientName || recipient
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

  const event       = obj.event
  const campaign_id = obj.campaign_id
  const email_id    = null
  const recipient   = null

  await sendNotification({ event, campaign_id, email_id, recipient })
  await zrem(debounce_key, record)
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