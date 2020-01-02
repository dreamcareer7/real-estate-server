const { expect } = require('chai')
const { createContext } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User')
const BrandHelper = require('../brand/helper')
const GoogleCalendar      = require('../../../lib/models/Google/calendar')
const GoogleCalendarEvent = require('../../../lib/models/Google/calendar_events')

const { createGoogleMessages } = require('./helper')

let user, brand, googleCredential, googleCalendar

const calendars = {
  remote_cal_1: {
    id: 'remote_cal_id_1',
    summary: 'summary_1',
    summaryOverride: 'summaryOverride_1',
    description: 'description_1',
    location: 'location',
    timeZone: 'timeZone',
    conferenceProperties: 'conferenceProperties',
    origin: 'google',
    accessRole: 'owner',
    selected: false,
    deleted: false,
    primary: false,
    defaultReminders: {},
    notificationSettings: {},
    conference_properties: {}
  }
}

const events = {
  remote_event_1: {
    id: 'remote_event_id_1',

    description: 'description',
    summary: 'summary',
    location: 'location',
    colorId: 'colorId',
    iCalUID: 'iCalUID',
    transparency: 'transparent',
    visibility: 'visibility',
    hangoutLink: 'hangoutLink',
    htmlLink: 'htmlLink',
    status: 'confirmed',
    sequence: 123456,
    
    anyoneCanAddSelf: false,
    guestsCanInviteOthers: true,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: true,
    attendeesOmitted: false,
    locked: false,
    privateCopy: false,

    creator: {
      email: 'heshmat.zapata@gmail.com'
    },
    organizer: {
      email: 'jqq8b51h0rfdujo4ofted56uqc@group.calendar.google.com',
      displayName: 'calendar-summary',
      self: true
    },
    attendees: {},
    attachments: {},
    conferenceData: {},
    extendedProperties: {},
    gadget: {},
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 10 }
      ]
    },
    source: {},

    created: '2019-10-22T20:20:44.000Z',
    updated: '2019-10-22T20:20:44.474Z',

    start: {
      dateTime: '2019-10-20T09:00:00-07:00',
      timeZone: 'America/Los_Angeles'
    },
    end: {
      dateTime: '2019-10-20T11:00:00-07:00',
      timeZone: 'America/Los_Angeles'
    },
    endTimeUnspecified: false,
    recurrence: [],
    recurringEventId: '1rrf5h0rbl2ecs56qsdl6h3m63',
    originalStartTime: {}
  }
}

// const configs = {}


async function createCal() {
  const id  = await GoogleCalendar.createLocal(googleCredential.id, calendars.remote_cal_1)
  const cal = await GoogleCalendar.get(id)

  expect(cal.id).to.be.equal(id)
  expect(cal.calendar_id).to.be.equal(calendars.remote_cal_1.id)
  expect(cal.type).to.be.equal('google_calendars')
  expect(cal.google_credential).to.be.equal(googleCredential.id)
  expect(cal.summary).to.be.equal(calendars.remote_cal_1.summary)
  expect(cal.location).to.be.equal(calendars.remote_cal_1.location)
  expect(cal.timeZone).to.be.equal(calendars.remote_cal_1.time_zone)
  expect(cal.description).to.be.equal(calendars.remote_cal_1.description)
  expect(cal.origin).to.be.equal(calendars.remote_cal_1.origin)
  expect(cal.selected).to.be.equal(false)
  expect(cal.deleted).to.be.equal(false)
  expect(cal.primary).to.be.equal(false)
  expect(cal.sync_token).to.be.equal(null)
  expect(cal.watcher).to.be.equal(null)
  expect(cal.watcher_status).to.be.equal(null)
  expect(cal.watcher_channel_id).to.be.equal(null)
  expect(cal.deleted_at).to.be.equal(null)

  return cal
}

async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential } = await createGoogleMessages(user, brand)
  googleCredential = credential

  googleCalendar = await createCal()

  Context.set({ user, brand, googleCredential, googleCalendar })
}

async function createLocal() {
  const id    = await GoogleCalendarEvent.createLocal(googleCredential.id, googleCalendar.id, events.remote_event_1)
  const event = await GoogleCalendarEvent.get(id)

  expect(event.id).to.be.equal(id)
  expect(event.google_calendar).to.be.equal(googleCalendar.id)
  expect(event.google_credential).to.be.equal(googleCredential.id)
  expect(event.event_id).to.be.equal(events.remote_event_1.id)
  expect(event.summary).to.be.equal(events.remote_event_1.summary)
  expect(event.location).to.be.equal(events.remote_event_1.location)
  expect(event.timeZone).to.be.equal(events.remote_event_1.time_zone)
  expect(event.description).to.be.equal(events.remote_event_1.description)
  expect(event.origin).to.be.equal('rechat')
  expect(event.status).to.be.equal(events.remote_event_1.status)
  expect(event.recurring_event_id).to.be.equal(events.remote_event_1.recurring_eventid)
  expect(event.type).to.be.equal('google_calendar_events')
  expect(event.organizer).to.deep.equal(events.remote_event_1.organizer)
  expect(new Date(event.created).getTime()).to.be.equal(new Date(events.remote_event_1.created).getTime())
  expect(event.event_start).to.deep.equal(events.remote_event_1.start)
  expect(event.event_end).to.deep.equal(events.remote_event_1.end)

  return event
}

async function updateLocal() {
  const event   = await createLocal()
  const ids     = await GoogleCalendarEvent.updateLocal(event.id, event)
  const updated = await GoogleCalendarEvent.get(ids[0])

  expect(event.id).to.be.equal(updated.id)
  expect(event.google_calendar).to.be.equal(updated.google_calendar)
  expect(event.google_credential).to.be.equal(updated.google_credential)
  expect(event.event_id).to.be.equal(updated.event_id)
  expect(event.summary).to.be.equal(updated.summary)
  expect(event.location).to.be.equal(updated.location)
  expect(event.timeZone).to.be.equal(updated.timeZone)
  expect(event.description).to.be.equal(updated.description)
  expect(event.origin).to.be.equal(updated.origin)
  expect(event.status).to.be.equal(updated.status)
  expect(event.recurring_event_id).to.be.equal(updated.recurring_event_id)
  expect(event.organizer).to.deep.equal(updated.organizer)
  expect(event.event_start).to.deep.equal(updated.event_start)
  expect(event.event_end).to.deep.equal(updated.event_end)

  return event
}


describe('Google', () => {
  describe('Google Calendars', () => {
    createContext()
    beforeEach(setup)

    it('should create a google calendar event', createLocal)
    it('should update a google calendar event', updateLocal)

  })
})