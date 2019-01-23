const { expect } = require('chai')
const { DateTime } = require('luxon')

const { createContext, handleJobs } = require('../helper')
const promisify = require('../../../lib/utils/promisify')

const Brand = require('../../../lib/models/Brand')
const BrandRole = require('../../../lib/models/Brand/role')
const CalendarNotification = require('../../../lib/models/Calendar/notification')
const CalendarWorker = require('../../../lib/models/Calendar/worker')
const Contact = require('../../../lib/models/Contact')
const User = require('../../../lib/models/User')

const attachContactEvents = require('../../../lib/models/Contact/events')
const attachTouchEventHandler = require('../../../lib/models/CRM/Touch/events')

attachContactEvents()
attachTouchEventHandler()

let user, brand, contact

async function createBrand() {
  const b = await Brand.create({
    name: 'Test Brand',
    brand_type: Brand.BROKERAGE
  })

  const role = await BrandRole.create({
    brand: b.id,
    role: 'Admin',
    acl: ['*']
  })

  await BrandRole.addMember({
    user: user.id,
    role: role.id
  })

  return Brand.get(b.id)
}

async function setup() {
  user = await promisify(User.getByEmail)('test@rechat.com')
  brand = await createBrand()

  await createContact()
  await CalendarNotification.setGlobalSettings(
    [
      {
        object_type: 'contact_attribute',
        event_type: 'birthday',
        reminder: 2 * 24 * 3600 // 2 days
      }
    ],
    user.id,
    brand.id
  )
}

async function createContact() {
  const cids = await Contact.create(
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
            date: DateTime.local()
              .startOf('day')
              .plus({ days: 2 })
              .toSeconds()
          },
          {
            attribute_type: 'child_birthday',
            label: 'John',
            date: DateTime.local()
              .startOf('day')
              .plus({ days: 20 })
              .toSeconds()
          }
        ]
      }
    ],
    user.id,
    brand.id,
    { activity: false, get: false, relax: false }
  )

  contact = await Contact.get(cids[0])

  await promisify(handleJobs)()
}

async function findDueEvents() {
  const events = await CalendarWorker.getNotificationDueEvents()

  expect(events.length).to.be.eq(1, 'events.length')
  expect(events[0].contact).to.equal(contact.id)
}

async function sendNotification() {
  await CalendarWorker.sendReminderNotifications()

  await promisify(handleJobs)()
}

async function makeSureItsLogged() {
  await sendNotification()
  const events = await CalendarWorker.getNotificationDueEvents()

  expect(events).to.be.empty
}

describe('Calendar', () => {
  describe('notifications', () => {
    createContext()
    beforeEach(setup)

    context('when there is an upcoming birthday', () => {
      it('should find due events correctly', findDueEvents)
      it('should send a notification to subscribed users', sendNotification)
      it('should log the event notification', makeSureItsLogged)
    })
  })
})
