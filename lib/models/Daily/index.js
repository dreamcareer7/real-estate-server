const config = require('../../config.js')
const { peanar } = require('../../utils/peanar')
const db = require('../../utils/db.js')
const render = require('../../utils/render')
const promisify = require('../../utils/promisify')
const Calendar = require('../../models/Calendar')
const CrmTask = require('../../models/CRM/Task')
const Contact = require('../../models/Contact')
const EmailCampaign = require('../../models/Email/campaign')
const EmailCampaignEmail = require('../../models/Email/campaign/email')
const moment = require('moment-timezone')

const {
  keyBy,
  groupBy
} = require('lodash')
const Daily = {}

Daily.sendDue = async () => {
  const { rows } = await db.query.promise('daily/due', [])

  const users = rows.map(r => r.user)

  await Promise.all(users.map(Daily.sendForUser))
}

const celebration_events = [
  'birthday',
  'child_birthday',
  'home_anniversary',
  'wedding_anniversary'
]

Daily.sendForUser = async user_id => {
  const user = await User.get(user_id)

//   const low = parseInt(moment.tz(morning, user.timezone).format('X'))
//   const low = parseInt(moment(morning).format('X'))
//   const high = parseInt(moment.tz(midnight, user.timezone).format('X'))
  const low = moment.tz(user.timezone).startOf('day').add(6, 'hours').unix()
  const high = moment.tz(user.timezone).startOf('day').add(2, 'days').unix()

  const calendar = await Calendar.filter({}, {
    users:[user.id],
//     event_types: [
//       'birthday',
//       'child_birthday',
//       'home_anniversary',
//       'wedding_anniversary',
//       'work_anniversary',
//       'Call',
//       'Message',
//       'Todo',
//       'Tour',
//       'Listing appointment',
//       'Follow up',
//       'Open House',
//     ],
    low,
    high,
    object_types: [
      'crm_task',
      'deal_context',
      'contact_attribute',
      'contact'
    ]
  })

//   const crm_task_ids = chain(calendar)
//                       .filter({object_type: 'crm_task'})
//                       .map('crm_task')
//                       .value()

//   const loaded_crm_tasks = await CrmTask.getAll(crm_task_ids)


  const contact_ids = calendar
                        .filter(e => Array.isArray(e.people))
                        .map(e => e.people)
                        .flat()
                        .map(c => c.id)

  const loaded_contacts = await Contact.getAll(contact_ids)
  const contacts = keyBy(loaded_contacts, 'id')

  const deal_ids = calendar
                        .map(e => e.deal)
                        .filter(Boolean)

  const loaded_deals = await promisify(Deal.getAll)(deal_ids)
  const deals = keyBy(loaded_deals, 'id')


  const isToday = event => moment(event.date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')

//   const grouped = groupBy(calendar, event => moment(event.date).format('YYYY-MM-DD'))
  const today = calendar.filter(Boolean)

  const celebrations = calendar.filter(e => celebration_events.includes(e.event_type) && !isToday(e))

  Orm.setEnabledAssociations(['email_campaign.emails'])

  Orm.setAssociationConditions({
    'email_campaign.emails': {
      limit: 1
    }
  })
  const email_campaigns = await EmailCampaign.getByUser(user.id, new Date(low), new Date(high))
  const email_ids = email_campaigns.map(e => e.emails).flat().filter(Boolean)

  const loaded_emails = await EmailCampaignEmail.getAll(email_ids)
  const emails = keyBy(loaded_emails, 'id')

  const data = {
      user,
      today,
      celebrations,
      deals,
      contacts,
      email_campaigns,
      emails
  }
  const template = __dirname + '/../../mjml/daily/index.mjml'
  const html = await promisify(render.mjml)(template, data)

  return Email.create({
    from: config.email.from,
    to: ['emil@rechat.com'],
    html,
    subject: 'Rechat Daily'
  })
}

// Daily.sendForUser = peanar.job({
//   handler: sendForUser,
//   queue: 'daily_email',
//   error_exchange: 'daily_email.error',
//   exchange: 'daily',
//   name: 'sendDaily'
// })

module.exports = Daily
