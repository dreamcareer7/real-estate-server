const config = require('../../config.js')
const { peanar } = require('../../utils/peanar')
const db = require('../../utils/db.js')
const render = require('../../utils/render')
const promisify = require('../../utils/promisify')
const Calendar = require('../Calendar')
const Contact = require('../Contact')
const EmailCampaign = require('../Email/campaign')
const Email = require('../Email')
const EmailCampaignEmail = require('../Email/campaign/email')
const moment = require('moment-timezone')
const { keyBy } = require('lodash')

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

  const low = moment.tz(user.timezone).startOf('day').add(6, 'hours').unix()
  const high = moment.tz(user.timezone).startOf('day').add(2, 'days').unix()

  const calendar = await Calendar.filter({}, {
    users: [user.id],
    low,
    high,
    object_types: [
      'crm_task',
      'deal_context',
      'contact_attribute',
      'contact'
    ]
  })

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

  const active_deals = await Deal.filter({
    user,
    filter: {
      status: {
        is_active: true
      },
      role: {
        user: [user.id]
      },
      $order: ['deals.created_by', 'DESC'],
      limit: 5
    }
  })

  const isToday = event => moment(event.date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')

  const today = calendar.filter(Boolean)

  const celebrations = calendar.filter(e => celebration_events.includes(e.event_type) && !isToday(e))

  Orm.setEnabledAssociations(['email_campaign.emails'])

  Orm.setAssociationConditions({
    'email_campaign.emails': {
      limit: 1
    }
  })

  const email_low = moment.tz(user.timezone).startOf('day').subtract(2, 'days').unix()
  const email_campaigns = await EmailCampaign.getByUser(user.id, new Date(email_low * 100), new Date(high * 1000))

  const email_ids = email_campaigns.map(e => e.emails).flat().filter(Boolean)

  const loaded_emails = await EmailCampaignEmail.getAll(email_ids)
  const emails = keyBy(loaded_emails, 'id')

  const data = {
    user,
    today,
    celebrations,
    deals,
    active_deals,
    contacts,
    email_campaigns,
    emails
  }
  const template = __dirname + '/../../mjml/daily/index.mjml'
  const html = await promisify(render.mjml)(template, data)

  if (today.length < 1 && celebrations.length < 1 && deals.length < 1 && email_campaigns.length < 1) {
    return Daily.save(user.id)
  }

  const email =  await Email.create({
    from: config.email.from,
    to: [user.email],
    html,
    subject: 'Rechat Daily'
  })

  return Daily.save(user.id, email.id)
}

Daily.save = (user_id, email_id) => {
  return db.query.promise('daily/save', [user_id, email_id])
}

Daily.queueForUser = peanar.job({
  handler: Daily.sendForUser,
  queue: 'daily_email',
  error_exchange: 'daily_email.error',
  exchange: 'daily',
  name: 'sendDaily'
})

module.exports = Daily
