const config = require('../../config.js')
const { peanar } = require('../../utils/peanar')
const db = require('../../utils/db.js')
const render = require('../../utils/render')
const promisify = require('../../utils/promisify')
const Calendar = require('../Calendar')
const Contact = require('../Contact/get')
const EmailCampaign = require('../Email/campaign/get')
const Context = require('../../models/Context')
const Email = require('../Email/create')
const User = require('../User/get')
const EmailCampaignEmail = require('../Email/campaign/email')
const Deal = {
  ...require('../Deal/get'),
  ...require('../Deal/filter'),
}
const Orm = require('../Orm/context')
const moment = require('moment-timezone')
const { chain, keyBy } = require('lodash')

const { getWebinars } = require('./webinars')

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


const fixCurrentYear = e => {
  const now = new Date()

  if (e.date.getFullYear() === 1800)
    e.date.setFullYear(now.getFullYear())

  return e
}

Daily.sendForUser = async user_id => {
  const user = await User.get(user_id)
  Context.set({user})

  const low = moment.tz(user.timezone).startOf('day').add(6, 'hours').unix()
  const high = moment.tz(user.timezone).startOf('day').add(7, 'days').unix()

  const _calendar = await Calendar.filter({}, {
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

  const calendar = chain(_calendar)
    .map(fixCurrentYear)
    .orderBy(['all_day', 'date'], ['desc', 'asc'])
    .value()

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

  const _active_deals = await Deal.filter({
    user,
    filter: {
      deal_type: ['Selling'],
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

  const last_week = moment().startOf('day').subtract(14, 'days').unix()

  const active_deals = _active_deals.filter(deal => {
    return deal.updated_at > last_week
  })

  const isToday = event => moment(event.date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')

  const today = calendar.filter(isToday)

  const _celebrations = calendar.filter(e => celebration_events.includes(e.event_type) && !isToday(e))
  const celebrations = chain(_celebrations)
    .sortBy(['next_occurence'])
    .value()

  Orm.setEnabledAssociations(['email_campaign.emails'])

  Orm.setAssociationConditions({
    'email_campaign.emails': {
      limit: 1
    }
  })

  const email_low = moment.tz(user.timezone).startOf('day').subtract(2, 'days').unix()
  const _email_campaigns = await EmailCampaign.getByUser(user.id, new Date(email_low * 1000), new Date(high * 1000))

  const isMailgun = c => {
    return !c.microsoft_credential && !c.google_credential
  }

  const email_campaigns = chain(_email_campaigns)
    .filter(isMailgun)
    .orderBy(['executed_at'], ['desc'])
    .value()

  const email_ids = email_campaigns.map(e => e.emails).flat().filter(Boolean)

  const loaded_emails = await EmailCampaignEmail.getAll(email_ids)
  const emails = chain(loaded_emails).keyBy('id').value()

  if (today.length < 1 && celebrations.length < 1 && active_deals.length < 1 && email_campaigns.length < 1)
    return Daily.save(user.id, user.timezone)

  const webinars = await getWebinars()

  const data = {
    user,
    today,
    celebrations,
    deals,
    active_deals,
    contacts,
    now: Date.now() / 1000,
    email_campaigns,
    emails,
    webinars
  }
  const template = __dirname + '/../../mjml/daily/index.mjml'
  const html = await promisify(render.mjml)(template, data)

  const email =  await Email.create({
    from: config.email.from,
    to: [user.email],
    html,
    tags: ['daily'],
    subject: 'Rechat Daily'
  })

  await Daily.save(user.id, user.timezone, email.id)

  return email.id
}

Daily.save = (user_id, timezone, email_id) => {
  return db.query.promise('daily/save', [user_id, timezone, email_id])
}

Daily.queueForUser = peanar.job({
  handler: Daily.sendForUser,
  queue: 'daily_email',
  error_exchange: 'daily_email.error',
  exchange: 'daily',
  name: 'sendDaily'
})

module.exports = Daily
