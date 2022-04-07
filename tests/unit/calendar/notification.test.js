const cheerio = require('cheerio')
const { expect } = require('chai')
const moment = require('moment-timezone')
const { Mock } = require('./data/mock')

const { createContext, handleJobs } = require('../helper')

const promisify = require('../../../lib/utils/promisify')
const sql = require('../../../lib/utils/sql')
const render_filters = require('../../../lib/utils/render/filters')

const CalendarNotification = require('../../../lib/models/Calendar/notification')
const CalendarWorker = require('../../../lib/models/Calendar/worker/notification')
const Contact = require('../../../lib/models/Contact/manipulate')
const Context = require('../../../lib/models/Context')
const Email = require('../../../lib/models/Email/get')
const Orm = require('../../../lib/models/Orm/context')
const Deal = require('../../../lib/models/Deal')
const { Listing } = require('../../../lib/models/Listing')
const Notification = require('../../../lib/models/Notification')
const User = require('../../../lib/models/User/get')
const CrmTask = require('../../../lib/models/CRM/Task')
const CrmTaskNotification = require('../../../lib/models/CRM/Task/worker/notification')

const BrandHelper = require('../brand/helper')
const DealHelper = require('../deal/helper')
const { attributes } = require('../contact/helper')
const Reminder = require('../../../lib/models/CRM/Task/reminder')

let user, brand, listing, deal
let CLOSING_DATE, CONTRACT_DATE

async function setupBrands(without_checklists = false) {
  user = await User.getByEmail('test@rechat.com')
  const listings = await Listing.getByMLSNumber(10018693)
  listing = listings[0]

  const brand_data = {
    roles: {
      Admin: [user.id]
    }
  }

  if (without_checklists) {
    brand_data.contexts = []
    brand_data.checklists = []
  }

  brand = await BrandHelper.create(brand_data)
  Context.set({ user, brand })

  await handleJobs()
}

async function setup(without_checklists = false) {
  await setupBrands(without_checklists)

  await CalendarNotification.setGlobalSettings(
    [
      {
        object_type: 'contact_attribute',
        event_type: 'birthday',
        reminder: 3 * 24 * 3600 // 3 days
      },
      {
        object_type: 'contact_attribute',
        event_type: 'child_birthday',
        reminder: 2 * 24 * 3600 // 2 days
      },
      {
        object_type: 'deal_context',
        event_type: 'contract_date',
        reminder: 1 * 24 * 3600 // 1 day
      },
      {
        object_type: null,
        event_type: 'home_anniversary',
        reminder: 2 * 24 * 3600
      }
    ],
    user.id,
    brand.id
  )

  CLOSING_DATE = moment.utc().add(10, 'day')
  CONTRACT_DATE = moment.utc().add(1, 'day')
}

async function getEmails() {
  Orm.setPublicFields({ select: { email: ['html', 'text'] }, omit: {} })

  const ids = await sql.selectIds(`
    SELECT
      id
    FROM
      emails
  `)

  const emails = await Email.getAll(ids)
  
  if (emails.length === 0) {
    throw new Error('No emails found!')
  }

  return emails
}

async function createDeal() {
  deal = await DealHelper.create(user.id, brand.id, {
    checklists: [
      {
        context: {
          closing_date: { value: CLOSING_DATE.format() },
          contract_date: { value: CONTRACT_DATE.format() }
        }
      }
    ],
    roles: [
      {
        role: 'BuyerAgent',
        email: user.email,
        phone_number: user.phone_number,
        legal_first_name: user.first_name,
        legal_last_name: user.last_name
      }
    ],
    listing: listing.id,
    is_draft: false
  })
}

async function createContact() {
  await Contact.create(
    [
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'John'
          },
          {
            attribute_type: 'first_name',
            text: 'Jane',
            is_partner: true
          },
          {
            attribute_type: 'birthday',
            date: moment
              .utc()
              .startOf('day')
              .add(20, 'days')
              .unix()
          },
          {
            attribute_type: 'birthday',
            is_partner: true,
            date: moment
              .utc()
              .startOf('day')
              .add(3, 'days')
              .year(1800)
              .unix()
          },
          {
            attribute_type: 'child_birthday',
            label: 'Tom',
            date: moment
              .utc()
              .startOf('day')
              .add(2, 'days')
              .add(-10, 'years')
              .unix()
          }
        ]
      }
    ],
    user.id,
    brand.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()
}

function findDueContactEvents() {
  return async function() {
    const events = await CalendarWorker.getNotificationDueEvents()

    expect(events.length).to.be.eq(2, 'events.length')
    expect(events.map(e => e.event_type)).to.have.members(['child_birthday', 'birthday'])
  }
}

function findDueEvents(expected_event) {
  return async function() {
    const events = await CalendarWorker.getNotificationDueEvents()

    expect(events.length).to.be.eq(1, 'events.length')
    expect(events[0]).to.include(expected_event)
  }
}

async function findDueHomeAnniversaries() {
  await DealHelper.create(user.id, brand.id, {
    deal_type: 'Buying',
    checklists: [{
      context: {
        contract_date: { value: moment.utc().add(-1, 'year').add(-5, 'day').startOf('day').format() },
        closing_date: { value: moment.utc().add(-1, 'year').add(2, 'days').startOf('day').format() },
      },
    }],
    roles: [{
      role: 'BuyerAgent',
      email: user.email,
      phone_number: user.phone_number,
      legal_first_name: user.first_name,
      legal_last_name: user.last_name
    }, {
      role: 'Buyer',
      email: 'john@doe.com',
      phone_number: '(281) 531-6582',
      legal_first_name: 'John',
      legal_last_name: 'Doe'
    }],
    listing: listing.id,
    is_draft: false
  })

  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
    }),
  }], user.id, brand.id)

  await handleJobs()
  await sql.update('REFRESH MATERIALIZED VIEW CONCURRENTLY deals_brands')
  await sql.update('REFRESH MATERIALIZED VIEW calendar.deals_buyers')
  await sql.update('REFRESH MATERIALIZED VIEW calendar.deals_closed_buyers')

  const events = await CalendarWorker.getNotificationDueEvents()

  expect(events.length).to.be.eq(2, 'events.length')
  expect(events.map(e => e.event_type)).to.have.members(['home_anniversary', 'contract_date'])
}

async function sendNotificationForContact() {
  await CalendarWorker.sendReminderNotifications()
  await handleJobs()

  const notifications = await promisify(Notification.getForUser)(user.id, {})
  expect(notifications).to.have.length(2)

  const birthday1 = moment()
    .tz(user.timezone)
    .add(2, 'days')
    .add(-10, 'years')
    .unix()
  const birthday2 = moment()
    .tz(user.timezone)
    .add(3, 'days')
    .year(1800)
    .unix()
  expect(notifications.map(n => n.message)).to.have.members([
    `John's spouse (Jane) has a Birthday on ${render_filters.date(
      birthday2,
      'MMM D'
    )}`,
    `John has a Child Birthday (Tom) on ${render_filters.date(
      birthday1,
      'MMM D, YYYY'
    )}`
  ])
}

async function sendNotificationForDeal() {
  await CalendarWorker.sendReminderNotifications()
  await handleJobs()

  const notifications = await promisify(Notification.getForUser)(user.id, {})
  expect(notifications).not.to.be.empty
  expect(notifications[0].message).to.be.equal(
    `9641 INWOOD Road has an Executed Date on ${render_filters.time(
      Deal.getContext(deal, 'contract_date').getTime() / 1000,
      'MMM D, YYYY',
      'UTC'
    )}`
  )
}

async function sendNotificationAgain() {
  await CalendarWorker.sendReminderNotifications()
  await handleJobs()

  await CalendarWorker.sendReminderNotifications()
  await handleJobs()
}

async function makeSureItsLogged() {
  await CalendarWorker.sendReminderNotifications()
  await handleJobs()

  const events = await CalendarWorker.getNotificationDueEvents()
  expect(events).to.be.empty
}

async function sendEmailForUnread() {
  await CalendarWorker.sendReminderNotifications()
  await handleJobs()

  const notifications = await CalendarWorker.getUnreadNotifications()
  expect(notifications).not.to.be.empty

  await CalendarWorker.sendEmailForUnread()
  await handleJobs()
}

async function testCheckEmailForDeal() {
  await Contact.create(
    [
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Abbas'
          },
          {
            attribute_type: 'birthday',
            date: moment()
              .tz(user.timezone)
              .add(20, 'days')
              .unix()
          }
        ]
      }
    ],
    user.id,
    brand.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()
  await sendEmailForUnread()

  const emails = await getEmails()
  expect(emails).to.have.length(1)

  const { html, subject } = emails[0]
  const $ = cheerio.load(html)

  expect(subject).to.be.equal('Upcoming Rechat Event')

  expect($('#row2 th').children()).to.have.length(4)
  expect(
    $('#row2 p:nth-child(1)')
      .text()
      .trim()
  ).to.be.equal('Executed Date:')
  expect(
    $('#row2 p:nth-child(2)')
      .text()
      .trim()
  ).to.be.equal(Deal.getContext(deal, 'full_address'))
  expect(
    $('#row2 p:nth-child(3)')
      .text()
      .trim()
  ).to.be.equal(
    `On ${render_filters.time(
      Deal.getContext(deal, 'contract_date').getTime() / 1000,
      'MMM D, YYYY',
      'UTC'
    )}`
  )
  expect(
    $('#row2 p:nth-child(4)')
      .text()
      .trim()
  ).to.be.equal('a day before')

  expect($('#row6 tbody').children()).to.have.length(2)
  expect(
    $('#row6 tbody tr:nth-child(1) p:nth-child(1)')
      .text()
      .trim()
  ).to.be.equal('Executed Date')
  expect(
    $('#row6 tbody tr:nth-child(1) p:nth-child(2)')
      .text()
      .trim()
  ).to.be.equal(
    `On ${render_filters.time(
      Deal.getContext(deal, 'contract_date').getTime() / 1000,
      'MMM D, YYYY',
      'UTC'
    )}`
  )
  expect(
    $('#row6 tbody tr:nth-child(2) p:nth-child(1)')
      .text()
      .trim()
  ).to.be.equal('Closing Date')
  expect(
    $('#row6 tbody tr:nth-child(2) p:nth-child(2)')
      .text()
      .trim()
  ).to.be.equal(
    `On ${render_filters.time(
      Deal.getContext(deal, 'closing_date').getTime() / 1000,
      'MMM D, YYYY',
      'UTC'
    )}`
  )
}

async function makeSureEmailDeliveryIsLogged() {
  await sendEmailForUnread()

  const notifications = await CalendarWorker.getUnreadNotifications()
  expect(notifications).to.be.empty
}

async function testDefaultSettings() {
  const settings = await CalendarNotification.getGlobalSettings(user.id, brand.id)
  expect(settings).not.to.be.empty
}

async function testResetNotificationSettings() {
  await CalendarNotification.setGlobalSettings([], user.id, brand.id)

  const settings = await CalendarNotification.getGlobalSettings(user.id, brand.id)

  expect(settings).to.be.empty
}

async function testEventDueNotification() {
  const now = moment().utc()
  const nextFiveSeconds = now.clone().add(5 ,'seconds')
  const previousHour = now.clone().add(-60 ,'minutes')
  const nextHour = now.clone().add(60 ,'minutes')
  const nextTwoHour = now.clone().add(120 ,'minutes')

  await CrmTask.createMany([
    Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: previousHour.unix(), end_date: nextFiveSeconds.unix(), all_day: false, task_type: 'crm_task' }),
    Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: nextFiveSeconds.unix(), end_date: nextHour.unix(), all_day: false, task_type: 'crm_task' }),
    Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: nextHour.unix(), end_date: nextTwoHour.unix(), all_day: false, task_type: 'crm_task' }),
  ])

  await CrmTaskNotification.sendTaskDueNotifications()

  const notifications = await promisify(Notification.getForUser)(user.id, {})
  // Should has one notification based on the above configs
  expect(notifications.length).to.be.equal(1)
}

async function testEventReminderNotification() {
  const now = moment().utc()
  const nextFiveSeconds = now.clone().add(5 ,'seconds')
  const nextHour = now.clone().add(60 ,'minutes')

  const withReminder = {
    ...Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: now.unix(), end_date: nextHour.unix(), all_day: false, task_type: 'crm_task', status: 'PENDING' }),
    reminders: [
      {
        is_relative: true,
        timestamp: nextFiveSeconds.unix(),

      }
    ]
  }

  const withOutReminder = {
    ...Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: now.unix(), end_date: nextHour.unix(), all_day: false, task_type: 'crm_task', status: 'PENDING' })
  }
  await CrmTask.createMany([
    withReminder,
    withOutReminder,
  ])

  const events = await CrmTask.getForUser(user.id, brand.id, {})
  const reminders = await Reminder.get(events[0]['reminders'][0])
  expect(reminders).to.not.equal(null)

  await CrmTaskNotification.sendReminderNotifications()

  const notifications = await promisify(Notification.getForUser)(user.id, {})
  // Should has one notification based on the above configs
  expect(notifications.length).to.be.equal(1)
}

describe('Calendar', () => {
  createContext()

  describe('contact notifications', () => {
    beforeEach(async () => await setup(true))
    beforeEach(createContact)
    context('when there is an upcoming birthday', () => {
      it(
        'should find due events correctly',
        findDueContactEvents()
      )
      it(
        'should send a notification to subscribed users',
        sendNotificationForContact
      )
      it(
        'should not try to send an already sent notification',
        sendNotificationAgain
      )
      it('should log the event notification', makeSureItsLogged)
      it('should send email for unread notifications', sendEmailForUnread)
      it('should log email delivery', makeSureEmailDeliveryIsLogged)
      it('should create a notification for an event on due date', testEventDueNotification)
      it('should create a notification for an event on reminder date', testEventReminderNotification)
    })
  })

  describe('deal notifications', () => {
    beforeEach(async () => await setup(false))
    beforeEach(createDeal)

    context('when there is an upcoming critical date', () => {
      it(
        'should find due events correctly',
        findDueEvents({
          event_type: 'contract_date',
          object_type: 'deal_context'
        })
      )
      it('should find due deal home anniversaries', findDueHomeAnniversaries)
      it(
        'should send a notification to subscribed users',
        sendNotificationForDeal
      )
      it('should log the event notification', makeSureItsLogged)
      it('should send email for unread notifications', sendEmailForUnread)
      it(
        'should list upcoming dates for the deal at the bottom of the email',
        testCheckEmailForDeal
      )
      it('should log email delivery', makeSureEmailDeliveryIsLogged)
    })
  })

  describe('notification settings', () => {
    beforeEach(async () => await setupBrands(false))

    it('should have all settings by default', testDefaultSettings)
    it('should allow clearing all settings', testResetNotificationSettings)
  })
})
