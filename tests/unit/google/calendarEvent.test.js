const { expect } = require('chai')
const { createContext } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User')
const BrandHelper = require('../brand/helper')
const GoogleCalendar      = require('../../../lib/models/Google/calendar')
const GoogleCalendarEvent = require('../../../lib/models/Google/calendar_events')

const { generateCalendarEventRecord } = require('../../../lib/models/Google/workers/calendars/common.js')


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

    attendees: [
      {
        email: 'string',
        displayName: 'string',
        responseStatus: 'string',
        comment: 'strin'
      }
    ],
    attachments: [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 10 }
      ]
    },

    conferenceData: {},
    extendedProperties: {},
    gadget: {},
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
    originalStartTime: {
      date: '2020-01-05'
    }
  }
}


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
  const id    = await GoogleCalendarEvent.createLocal(googleCalendar, events.remote_event_1)
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
}

async function bulkUpsert() {
  const records = []

  records.push(generateCalendarEventRecord(googleCalendar, events.remote_event_1))

  const result = await GoogleCalendarEvent.bulkUpsert(records)

  expect(result.length).to.be.equal(records.length)
  expect(result[0].google_credential).to.be.equal(googleCredential.id)
  expect(result[0].google_calendar).to.be.equal(googleCalendar.id)
  expect(result[0].event_id).to.be.equal(events.remote_event_1.id)
}

async function deleteLocal() {
  const event = await createLocal()
  await GoogleCalendarEvent.deleteLocal(event.id)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
}

async function deleteLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  await GoogleCalendarEvent.deleteLocalByRemoteIds(cal, [event.event_id])
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
}

async function restoreLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  await GoogleCalendarEvent.restoreLocalByRemoteIds(cal, [event.event_id])
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('confirmed')
  expect(updated.deleted_at).to.be.equal(null)
}

async function deleteLocalByCalendar() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  await GoogleCalendarEvent.deleteLocalByCalendar(cal)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
}

async function getAll() {
  const event = await createLocal()

  const ids = [event.id]
  const events = await GoogleCalendarEvent.getAll(ids)

  expect(events.length).to.be.equal(ids.length)
}

async function getFailed() {
  try {
    await GoogleCalendarEvent.get(googleCredential.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Google calendar event by ${googleCredential.id} not found.`)
  }
}

async function getByCalendar() {
  const event  = await createLocal()
  const cal    = await GoogleCalendar.get(event.google_calendar)
  const events = await GoogleCalendarEvent.getByCalendar(cal)

  expect(events.length).to.be.equal(1)
  expect(events[0].id).to.be.equal(event.id)
  expect(events[0].google_credential).to.be.equal(event.google_credential)
  expect(events[0].google_calendar).to.be.equal(event.google_calendar)
}

async function getByCalendarAndEventRemoteIds() {
  const event  = await createLocal()
  const cal    = await GoogleCalendar.get(event.google_calendar)
  const events = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(cal, [event.event_id])

  expect(events.length).to.be.equal(1)
  expect(events[0].id).to.be.equal(event.id)
  expect(events[0].google_credential).to.be.equal(event.google_credential)
  expect(events[0].google_calendar).to.be.equal(event.google_calendar)
}

async function getByCalendarIds() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  const ids   = await GoogleCalendarEvent.getByCalendarIds(cal.google_credential, [cal.id])

  expect(ids.length).to.not.be.equal(0)
  expect(ids[0]).to.be.equal(event.id)
}

async function create() {
  const body = {
    'summary': 'Google I/O 2015',
    'location': '800 Howard St., San Francisco, CA 94103',
    'description': 'A chance to hear more about Google\'s developer products.',
    'start': {
      'dateTime': '2015-05-28T09:00:00-07:00',
      'timeZone': 'America/Los_Angeles'
    },
    'end': {
      'dateTime': '2015-05-28T17:00:00-07:00',
      'timeZone': 'America/Los_Angeles'
    },
    'attendees': [
      {'email': 'lpage@example.com'},
      {'email': 'sbrin@example.com'}
    ],
    'reminders': {
      'useDefault': false
    }
  }
  
  const id = await GoogleCalendarEvent.create(googleCalendar, body)
  const event = await GoogleCalendarEvent.get(id)

  expect(event.id).to.be.equal(id)
  expect(event.google_credential).to.be.equal(googleCalendar.google_credential)
  expect(event.google_calendar).to.be.equal(googleCalendar.id)
  expect(event.summary).to.be.equal(body.summary)
  expect(event.event_start).to.be.deep.equal(body.start)
  expect(event.event_end).to.be.deep.equal(body.end)
  expect(event.reminders).to.be.deep.equal(body.reminders)

  return event
}

async function update() {
  const event = await create()

  const body = {
    'summary': 'Google I/O 2015 - xxxx',
    'location': '800 Howard St., San Francisco, CA 94103 - xxxx',
    'description': 'A chance to hear more about Google\'s developer products - xxxx',
    'start': {
      'dateTime': '2016-05-28T09:00:00-07:00',
      'timeZone': 'America/Los_Angeles'
    },
    'end': {
      'dateTime': '2016-05-28T17:00:00-07:00',
      'timeZone': 'America/Los_Angeles'
    },
    'attendees': [
      {'email': 'lpagexxx@example.com'},
      {'email': 'sbrinxxx@example.com'}
    ],
    'reminders': {
      'useDefault': false
    }
  }
  
  await GoogleCalendarEvent.update(event.id, googleCalendar, body)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.google_credential).to.be.equal(googleCalendar.google_credential)
  expect(updated.google_calendar).to.be.equal(googleCalendar.id)
  expect(updated.summary).to.be.equal(body.summary)
  expect(updated.event_start).to.be.deep.equal(body.start)
  expect(updated.event_end).to.be.deep.equal(body.end)
  expect(updated.reminders).to.be.deep.equal(body.reminders)
}

async function deleteEvent() {
  const event = await create()
  
  await GoogleCalendarEvent.delete(event.id, googleCalendar)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.google_credential).to.be.equal(googleCalendar.google_credential)
  expect(updated.google_calendar).to.be.equal(googleCalendar.id)
  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
}


describe('Google', () => {
  describe('Google Calendars Events', () => {
    createContext()
    beforeEach(setup)

    it('should create a google calendar event', createLocal)
    it('should update a google calendar event', updateLocal)
    it('should upsert a batch of google calendar events', bulkUpsert)
    it('should delete a google calendar event', deleteLocal)
    it('should delete some google calendars by remote ids', deleteLocalByRemoteIds)
    it('should restore some google calendars by remote ids', restoreLocalByRemoteIds)
    it('should delete some google remote by calendar id', deleteLocalByCalendar)
    it('should returns an array of google calendar events', getAll)
    it('should handle get event', getFailed)
    it('should returns an array of google calendar events - by calendar id', getByCalendar)
    it('should returns an array of google calendar events - by calendar and event ids', getByCalendarAndEventRemoteIds)
    it('should returns an array of google calendar event ids - by calendar id', getByCalendarIds)

    it('should create a remote google calendar event', create)
    it('should update a remote google calendar event', update)
    it('should delete a remote google calendar event', deleteEvent)
  })
})