const db = require('../../../../utils/db')
const Context = require('../../../Context')

const { fastFilter } = require('../../../Contact/fast_filter')
const { get: getContact } = require('../../../../models/Contact/get')
const promisify = require('../../../../utils/promisify')
const redis = require('../../../../data-service/redis').createClient()
const zrem  = promisify(redis.zrem.bind(redis))
const srem  = promisify(redis.srem.bind(redis))
const smembers      = promisify(redis.smembers.bind(redis))
const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))

const { get: getCampaign } = require('../../campaign/get')
const { getByEmail }       = require('../../campaign/email/get')
const { issueForUsers }    = require('../../../Notification/issue')

const { open_debounce_key: debounce_key, reactedToEvents } = require('./constants')



const getRecipientName = async (brand, recipient) => {
  let recipientName = null

  try {
    const result = await fastFilter(brand, [{ attribute_type: 'email', value: recipient, operator: 'any' }], {})

    if ( result.ids.length ) {
      const contact = await getContact(result.ids[0]) // severl of which might have not displayname
    
      if (contact) {
        recipientName = contact.display_name
      }
    }
  } catch (ex) {
    Context.log('sendNotification-getRecipientName failed', ex.message, ex)
  }

  return recipientName
}

const sendNotification = async ({ event, campaign_id, email_id, recipient, count }) => {
  const notification = {}
  const user_ids = []

  if ( !reactedToEvents.includes(event) ) {
    return
  }

  try {
    const emailCampaign = await getCampaign(campaign_id)
    const subject = emailCampaign.subject


    /*
     * Handle Recipient name
     * This method will be used if only ther is one event at the very time.
     * Recipient valuse is only available in mailgun events
     */

    let recipientName = null

    if ( reactedToEvents.includes(event) && (count === 1) && recipient ) {  
      recipientName = await getRecipientName(emailCampaign.brand, recipient)
    }


    /*
     * Retrive emailCampaignEmail
     */
    if (email_id) {
      const emailCampaignEmail = await getByEmail(email_id)

      notification.object       = emailCampaignEmail.id
      notification.object_class = 'EmailCampaignEmail'
    }


    /*
     * Modify notification object
     */
    notification.subject = emailCampaign.id
    notification.subject_class = 'EmailCampaign'

    notification.object = emailCampaign.id
    notification.object_class = 'EmailCampaign'

    notification.action  = 'ReactedTo'
    notification.data    = { subject, event, count, recipient: recipientName || recipient }
    notification.title   = ''
    notification.message = ''


    user_ids.push(emailCampaign.created_by, emailCampaign.from)

  } catch (ex) {

    if ( ex.code === 'ResourceNotFound' ) {
      Context.log('sendNotification', ex)
      return
    }

    throw ex
  }

  await promisify(issueForUsers)(notification, Array.from(new Set(user_ids)), {})
}

const deleteMembers = async (key, members) => {
  const promises = []

  for (const member of members) {
    promises.push(srem(key, member))
  }

  await Promise.all(promises)
}

const processNotification = async (member) => {
  const obj = JSON.parse(member)

  const event       = obj.event
  const campaign_id = obj.campaign_id
  

  const key = `opened_notifications_${campaign_id}`
  const members = await smembers(key)

  const count = members.length

  if (!count) {
    return
  }

  if ( count > 1 ) {
    await sendNotification({ event, campaign_id, email_id: null, recipient: null, count })
  }

  if ( count === 1 ) {

    const records = await db.select('email/event/get', members[0])
    const email_event_obj = records[0]

    const email_id  = email_event_obj.email
    const recipient = email_event_obj.recipient // might be null in case of non-mailgun event

    await sendNotification({ event, campaign_id, email_id, recipient, count })
  }

  await deleteMembers(key, members)
  await zrem(debounce_key, member)
}

const sendNotifications = async () => {
  const until = Math.round(Date.now() / 1000)

  const members  = await zrangebyscore(debounce_key, 0, until)

  if ( members.length < 1 ) {
    return
  }

  const promises = []

  for (const member of members) {
    promises.push(processNotification(member))
  }

  await Promise.all(promises)
}


module.exports = {
  sendNotification,
  sendNotifications
}