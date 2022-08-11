const render = require('../../utils/render')
const promisify = require('../../utils/promisify')
const Calendar = require('../Calendar')
const Contact = require('../Contact/get')
const EmailCampaign = require('../Email/campaign/get')
const Context = require('../../models/Context')
const EmailCampaignEmail = require('../Email/campaign/email')
const CalendarIntegration = require('../CalendarIntegration/get')
const GoogleCalendarEvents = require('../Google/calendar_events/get')
const MicrosoftCalendarEvents = require('../Microsoft/calendar_events/get')
const Deal = {
  ...require('../Deal/get'),
  ...require('../Deal/filter'),
}
const Orm = require('../Orm/context')
const moment = require('moment-timezone')
const { chain, keyBy } = require('lodash')

const { getWebinars } = require('./webinars')
const { getWhatsNew } = require('./whatsnew')
const { getHolidays } = require('./holidays')
const { getAlarmingDeals } = require('./alarming-deals')


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

const generate = async user => {
  Context.set({user})

  Context.log('Sending daily for', user.email)

  const low = moment.tz(user.timezone).startOf('day').add(6, 'hours').unix()
  const high = moment.tz(user.timezone).startOf('day').add(7, 'days').unix()

  const _calendar = await Calendar.filter([], {
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

  const integrations = await CalendarIntegration.getByCrmTasks(_calendar.filter(ev => ev.object_type === 'crm_task').map(r => r.id))
  const google_events = await GoogleCalendarEvents.getAll(integrations.map(i => i.google_id).filter(Boolean))
  const microsoft_events = await MicrosoftCalendarEvents.getAll(integrations.map(i => i.microsoft_id).filter(Boolean))

  const indexed_integrations = keyBy(integrations, 'crm_task')
  const indexed_google_events = keyBy(google_events, 'id')
  const indexed_microsoft_events = keyBy(microsoft_events, 'id')

  const uniq = crm_task => {
    const integration = indexed_integrations[crm_task.id]

    if (!integration)
      return crm_task.id

    const { google_id, microsoft_id } = integration

    if (google_id)
      return indexed_google_events[google_id].event_id

    if (microsoft_id)
      return indexed_microsoft_events[microsoft_id].event_id

    throw new Error.Generic('Panic. This should not happen')
  }

  const calendar = chain(_calendar)
    .uniqBy(uniq)
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

  const holidays = await getHolidays(user)

  const alarming_deals = await getAlarmingDeals(user)

  if (today.length < 1 && celebrations.length < 1 && active_deals.length < 1 && email_campaigns.length < 1 && holidays.length < 1 && alarming_deals.length < 1)
    return

  const webinars = await getWebinars()
  const whatsnew = await getWhatsNew()

  const data = {
    user,
    today,
    celebrations,
    deals,
    active_deals,
    alarming_deals,
    contacts,
    now: Date.now() / 1000,
    email_campaigns,
    emails,
    webinars,
    whatsnew,
    holidays
  }
  const template = __dirname + '/../../mjml/daily/index.mjml'
  return promisify(render.mjml)(template, data)
}

module.exports = { generate }
