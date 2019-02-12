const { expect } = require('chai')
const moment = require('moment-timezone')

const { createContext, handleJobs } = require('../helper')
const promisify = require('../../../lib/utils/promisify')

const CalendarNotification = require('../../../lib/models/Calendar/notification')
const CalendarWorker = require('../../../lib/models/Calendar/worker')
const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const { Listing } = require('../../../lib/models/Listing')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')
const DealHelper = require('../deal/helper')

let user, brand, listing

async function setup() {
  user = await User.getByEmail('test@rechat.com')
  listing = await promisify(Listing.getByMLSNumber)(10018693)

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })
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
}

async function createDeal() {
  await DealHelper.create(user.id, brand.id, {
    checklists: [{
      context: {
        closing_date: { value: moment().tz(user.timezone).add(10, 'day').startOf('day').format() },
        contract_date: { value: moment().tz(user.timezone).add(1, 'day').startOf('day').format() },
      },
    }],
    roles: [{
      role: 'BuyerAgent',
      email: user.email,
      phone_number: user.phone_number,
      legal_first_name: user.first_name,
      legal_last_name: user.last_name
    }],
    listing: listing.id,
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
            text: 'Abbas'
          },
          {
            attribute_type: 'birthday',
            date: moment()
              .add(20, 'days')
              .startOf('day')
              .unix()
          },
          {
            attribute_type: 'child_birthday',
            label: 'John',
            date: moment()
              .add(1, 'days')
              .startOf('day')
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

function findDueEvents(expected_event) {
  return async function() {
    const events = await CalendarWorker.getNotificationDueEvents()

    Context.log(events)

    expect(events.length).to.be.eq(1, 'events.length')
    expect(events[0]).to.include(expected_event)
  }
}

async function sendNotification() {
  await CalendarWorker.sendReminderNotifications()

  await handleJobs()
}

async function makeSureItsLogged() {
  await sendNotification()
  const events = await CalendarWorker.getNotificationDueEvents()

  expect(events).to.be.empty
}

async function sendEmailForUnread() {
  await sendNotification()

  const notifications = await CalendarWorker.getUnreadNotifications()
  expect(notifications).not.to.be.empty

  await CalendarWorker.sendEmailForUnread()
  await handleJobs()
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
  beforeEach(setup)

  describe('contact notifications', () => {
    beforeEach(createContact)
    context('when there is an upcoming birthday', () => {
      it('should find due events correctly', findDueEvents({ event_type: 'child_birthday', object_type: 'contact_attribute' }))
      it('should send a notification to subscribed users', sendNotification)
      it('should log the event notification', makeSureItsLogged)
      it('should send email for unread notifications', sendEmailForUnread)
      it('should log email delivery', makeSureEmailDeliveryIsLogged)
    })
  })

  describe('deal notifications', () => {
    beforeEach(createDeal)

    context('when there is an upcoming critical date', () => {
      it('should find due events correctly', findDueEvents({ event_type: 'contract_date', object_type: 'deal_context' }))
      it('should send a notification to subscribed users', sendNotification)
      it('should log the event notification', makeSureItsLogged)
      it('should send email for unread notifications', sendEmailForUnread)
      it('should log email delivery', makeSureEmailDeliveryIsLogged)
    })
  })

  describe('notification settings', () => {
    it('should allow clearing all settings', testResetNotificationSettings)
  })
})
