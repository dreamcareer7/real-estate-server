const cheerio = require('cheerio')
const { expect } = require('chai')
const moment = require('moment-timezone')

const { createContext, handleJobs } = require('../helper')

const promisify = require('../../../lib/utils/promisify')
const sql = require('../../../lib/utils/sql')
const render_filters = require('../../../lib/utils/render_filters')

const CalendarNotification = require('../../../lib/models/Calendar/notification')
const CalendarWorker = require('../../../lib/models/Calendar/worker')
const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const { Listing } = require('../../../lib/models/Listing')
const Notification = require('../../../lib/models/Notification')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')
const DealHelper = require('../deal/helper')

let user, brand, listing, deal
let CLOSING_DATE, CONTRACT_DATE

async function setup(without_checklists = false) {
  user = await User.getByEmail('test@rechat.com')
  listing = await Listing.getByMLSNumber(10018693)

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

  await CalendarNotification.setGlobalSettings(
    [
      {
        object_type: 'contact_attribute',
        event_type: 'birthday',
        reminder: 2 * 24 * 3600 // 2 days
      },
      {
        object_type: 'contact_attribute',
        event_type: 'child_birthday',
        reminder: 1 * 24 * 3600 // 1 day
      },
      {
        object_type: 'deal_context',
        event_type: 'contract_date',
        reminder: 1 * 24 * 3600 // 1 day
      }
    ],
    user.id,
    brand.id
  )

  CLOSING_DATE = moment.utc().add(10, 'day')
  CONTRACT_DATE = moment.utc().add(1, 'day')
}

async function getEmails() {
  return sql.select(`
    SELECT
      *
    FROM
      emails
  `)
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
              .add(2, 'days')
              .year(1800)
              .unix()
          },
          {
            attribute_type: 'child_birthday',
            label: 'Tom',
            date: moment
              .utc()
              .startOf('day')
              .add(1, 'days')
              .add(-10, 'years')
              .unix()
          }
        ]
      }
    ],
    user.id,
    brand.id,
    { activity: false, get: false, relax: false }
  )

  await handleJobs()
}

function findDueContactEvents() {
  return async function() {
    const events = await CalendarWorker.getNotificationDueEvents()

    expect(events.length).to.be.eq(2, 'events.length')
    expect(events[0]).to.include({
      event_type: 'child_birthday',
      object_type: 'contact_attribute'
    })
  }
}

function findDueEvents(expected_event) {
  return async function() {
    const events = await CalendarWorker.getNotificationDueEvents()

    expect(events.length).to.be.eq(1, 'events.length')
    expect(events[0]).to.include(expected_event)
  }
}

async function sendNotificationForContact() {
  await CalendarWorker.sendReminderNotifications()
  await handleJobs()

  const notifications = await promisify(Notification.getForUser)(user.id, {})
  expect(notifications).to.have.length(2)

  const birthday1 = moment()
    .tz(user.timezone)
    .add(1, 'days')
    .add(-10, 'years')
    .unix()
  const birthday2 = moment()
    .tz(user.timezone)
    .add(2, 'days')
    .year(1800)
    .unix()
  expect(notifications[0].message).to.be.equal(
    `John's spouse (Jane) has a Birthday on ${render_filters.date(
      birthday2,
      'MMM D'
    )}`
  )
  expect(notifications[1].message).to.be.equal(
    `John has a Child Birthday (Tom) on ${render_filters.date(
      birthday1,
      'MMM D, YYYY'
    )}`
  )
}

async function sendNotificationForDeal() {
  await CalendarWorker.sendReminderNotifications()
  await handleJobs()

  const notifications = await promisify(Notification.getForUser)(user.id, {})
  expect(notifications).not.to.be.empty
  expect(notifications[0].message).to.be.equal(
    `9641  INWOOD Road has an Executed Date on ${render_filters.time(
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
    `Due ${render_filters.time(
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
    `Due ${render_filters.time(
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
    `Due ${render_filters.time(
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

async function testResetNotificationSettings() {
  await CalendarNotification.setGlobalSettings([], user.id, brand.id)

  const settings = await CalendarNotification.getGlobalSettings(user.id)

  expect(settings).to.be.empty
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
    it('should allow clearing all settings', testResetNotificationSettings)
  })
})
