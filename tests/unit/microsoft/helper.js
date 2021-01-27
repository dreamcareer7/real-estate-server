const { expect } = require('chai')

const MicrosoftCredential    = require('../../../lib/models/Microsoft/credential')
const MicrosoftMessage       = require('../../../lib/models/Microsoft/message')
const MicrosoftCalendar      = require('../../../lib/models/Microsoft/calendar')
const MicrosoftContact       = require('../../../lib/models/Microsoft/contact')
const MicrosoftCalendarEvent = require('../../../lib/models/Microsoft/calendar_events')
const EmailCampaign = require('../../../lib/models/Email/campaign')

const { generateRecord } = require('../../../lib/models/Microsoft/workers/outlook/common')

const Email   = {
  ...require('../../../lib/models/Email/constants'),
  ...require('../../../lib/models/Email/create'),
}

const microsoft_contacts_offline = require('./data/microsoft_contacts.json')
const microsoft_messages_offline = require('./data/microsoft_messages.json')
const calendars = require('./data/calendars.json')
const events    = require('./data/calendar_events.json')



async function createMicrosoftCredential(user, brand) {
  const body = require('./data/microsoft_credential')
  
  body.user  = user.id
  body.brand = brand.id

  const credentialId = await MicrosoftCredential.create(body)
  const credential   = await MicrosoftCredential.get(credentialId)

  return {
    credential,
    body
  }
}

async function createMicrosoftMessages(user, brand) {
  const { credential } = await createMicrosoftCredential(user, brand)

  const microsoftMessages = []

  for ( const message of microsoft_messages_offline ) {
    microsoftMessages.push(generateRecord(credential, message))
  }

  const createdMessages = await MicrosoftMessage.create(microsoftMessages, credential.id)

  return {
    createdMessages,
    credential
  }
}

async function createMicrosoftCalendar(microsoftCredential) {
  const id  = await MicrosoftCalendar.createLocal(microsoftCredential.id, calendars.remote_cal_1)
  const cal = await MicrosoftCalendar.get(id)

  expect(cal.id).to.be.equal(id)
  expect(cal.calendar_id).to.be.equal(calendars.remote_cal_1.id)
  expect(cal.type).to.be.equal('microsoft_calendars')
  expect(cal.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(cal.name).to.be.equal(calendars.remote_cal_1.name)
  expect(cal.to_sync).to.be.equal(false)

  return cal
}

async function createMicrosoftCalendarEvent(microsoftCredential) {
  const microsoftCalendar = await createMicrosoftCalendar(microsoftCredential)

  const id    = await MicrosoftCalendarEvent.createLocal(microsoftCalendar, events.remote_event_1)
  const event = await MicrosoftCalendarEvent.get(id)

  expect(event.id).to.be.equal(id)
  expect(event.microsoft_calendar).to.be.equal(microsoftCalendar.id)
  expect(event.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(event.event_id).to.be.equal(events.remote_event_1.id)
  expect(event.subject).to.be.equal(events.remote_event_1.subject)
  expect(event.type).to.be.equal('microsoft_calendar_events')
  expect(event.event_start).to.deep.equal(events.remote_event_1.start)
  expect(event.event_end).to.deep.equal(events.remote_event_1.end)

  return event
}

async function createCampaign(user, brand) {
  /** @type {IEmailCampaignInput} */
  const campaign = {
    created_by: user.id,
    brand: brand.id,
    from: user.id,
    to: [
      {
        tag: 'Tag1',
        recipient_type: Email.TAG
      },
      {
        tag: 'Tag2',
        recipient_type: Email.TAG
      }
    ],
    subject: '2',
    html: 'test',
    due_at: '2019-03-07'
  }

  const result = await EmailCampaign.createMany([campaign])

  return result[0]
}

async function createMicrosoftContact(user, brand) {
  const { credential } = await createMicrosoftCredential(user, brand)

  const records = []

  for (const mContact of microsoft_contacts_offline) {
    records.push({ microsoft_credential: credential.id, remote_id: mContact.id, data: JSON.stringify(mContact.data), source: mContact.source })
  }

  const createdMicrosoftContacts = await MicrosoftContact.create(records)

  for (const createdMicrosoftContact of createdMicrosoftContacts) {
    expect(createdMicrosoftContact.microsoft_credential).to.be.equal(credential.id)

    const microsoftContact = await MicrosoftContact.getByRemoteId(createdMicrosoftContact.microsoft_credential, createdMicrosoftContact.remote_id)

    expect(microsoftContact.type).to.be.equal('microsoft_contact')
    expect(microsoftContact.microsoft_credential).to.be.equal(createdMicrosoftContact.microsoft_credential)
    expect(microsoftContact.remote_id).to.be.equal(createdMicrosoftContact.remote_id)
  }

  return createdMicrosoftContacts[0]
}


module.exports = {
  createMicrosoftCredential,
  createMicrosoftMessages,
  createMicrosoftCalendar,
  createMicrosoftCalendarEvent,
  createCampaign,
  createMicrosoftContact
}