const _   = require('lodash')
const Orm = require('./../Orm')
const Context = require('../Context')
const config  = require('../../config')

const GoogleCredential    = require('./credential')
const GoogleCalendar      = require('./calendar')
const GoogleCalendarEvent = require('./calendar_events')
const Contact             = require('./../Contact')
const User                = require('./../User')
const CrmTask             = require('./../CRM/Task/index')

const { getMockClient, getGoogleClient } = require('./plugin/client.js')
const { generateCalendarEventRecord, generateCrmTaskRecord, getToSyncCalendars, fetchEvents } = require('./workers/calendars/common')

const SCOPE_GMAIL_READONLY = config.google_scopes.calendar[0]



const getClient = async (cid) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  const credential = await GoogleCredential.get(cid)

  if (credential.revoked)
    throw Error.BadRequest('Google-Credential is revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Google-Credential is deleted!')

  if (!credential.scope.includes(SCOPE_GMAIL_READONLY))
    throw Error.BadRequest('Access is denied! Insufficient permission.')

  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client failed!')

  return google
}

const setupMapping = async (googleCredential, calendar, confirmed, cancelled) => {
  console.log('confirmed length', confirmed.length)
  console.log('cancelled length', cancelled.length)

  const associations = ['crm_task.associations', 'crm_task.assignees', 'crm_task.reminders', 'crm_association.contact']
  const canceledEventRemoteIds = cancelled.map(event => event.id)

  // Find old google calendar events
  const confirmedRemoteIds = confirmed.map(e => e.id)
  const oldGoogleEvents    = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(calendar, confirmedRemoteIds)

  const oldEventRemoteIds = oldGoogleEvents.map(c => c.event_id)
  const oldEventByEventId = _.keyBy(oldGoogleEvents, 'event_id')
  
  const updatedEventRemoteIds = confirmed.filter(event => { if (oldEventRemoteIds.includes(event.id)) return true }).map(event => event.id)
  const google_event_ids      = confirmed.filter(event => { if (oldEventRemoteIds.includes(event.id)) return true }).map(event => oldEventByEventId[event.id].id)

  // Find olf crm_tasks
  const user = await User.get(googleCredential.user)
  Context.set({user})
  Orm.setEnabledAssociations(associations)

  const resutl = await CrmTask.filter(googleCredential.user, googleCredential.brand, { google_event_ids })
  const models = await CrmTask.getAll(resutl.ids)
  const tasks  = await Orm.populate({ models, associations })
  const tasksByGoogleId = _.keyBy(tasks, 'google_event_id')


  // find associations to create associationsMap
  const emails   = confirmed.filter(event => { if (event.attendees) return true }).flatMap(event => event.attendees.map(({email}) => email))
  const {ids}    = await Contact.fastFilter(googleCredential.brand, [{ attribute_type: 'email', value: emails, operator: 'any' }], {})
  const contacts = await Contact.getAll(ids)


  /*
    const contactsMap = {
      'a@rechat.com': c1,
      'b@rechat.com': c2,
      'c@rechat.com': null
    }

    Its possible that there are'nt few attendes(contact) in rechat
  */
  const contactsMap = {}
  for (const email of emails) {
    const c = contacts.find(contact => contact.emails.includes(email))
    if (c) contactsMap[email] = c.id
  }

  /*
    const associationsMap = {
      event_id_1: [{ contact: c1.id, association_type: 'contact' }],
      event_id_2: [{ contact: c2.id, association_type: 'contact' }],
    }
  */
  const associationsMap = {}
  for (const event of confirmed.filter(event => { if (event.attendees) return true })) {
    associationsMap[event.id] = event.attendees.filter(attendee => { if (contactsMap[attendee.email]) return true }).map(attendee => {
      return {
        association_type: 'contact',
        contact: contactsMap[attendee.email]
      }
    })
  }


  return {
    canceledEventRemoteIds,
    updatedEventRemoteIds,
    tasksByGoogleId,
    associationsMap
  }
}


const syncCalendarEvents = async (google, data) => {
  let confirmedNum = 0

  try {
    const toSyncRemoteCalendars = await getToSyncCalendars(data.googleCredential.id)

    for ( const calendar of toSyncRemoteCalendars ) {      
      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar)
      const { canceledEventRemoteIds, updatedEventRemoteIds, tasksByGoogleId, associationsMap } = await setupMapping(data.googleCredential, calendar, confirmed, cancelled)

      confirmedNum += confirmed.length


      /***  Handle Confirmed(Created/Updated) Events (Completed) ***/
      const newEvents = confirmed.map(event => generateCalendarEventRecord(calendar, event))
      const events    = await GoogleCalendarEvent.bulkUpsert(newEvents)
      const eventsByRemoteId = _.keyBy(events, 'event_id')


      /***  Update CRM_TASK records ???? ***/
      const toUpdateTasks = confirmed.filter(event => { if (updatedEventRemoteIds.includes(event.id)) return true }).map(event => {
        const gid  = eventsByRemoteId[event.id].id
        const tid  = tasksByGoogleId[gid].id

        if (tid) {
          const task = generateCrmTaskRecord(data.googleCredential, event)
  
          task.id = tid
          task.google_event_id = gid


          const liveAssociations = associationsMap[event.id] || []
          const oldAssociations  = tasksByGoogleId[gid].associations
          const oldContacts      = tasksByGoogleId[gid].contacts || []

          const associationByContact = _.keyBy(oldAssociations, 'contact.id')

          task.associations = liveAssociations.map(a => {
            const association = { contact: a.contact }

            if ( oldContacts.includes(a.contact) ) {
              const oldAssociation = associationByContact[a.contact]

              association.id = oldAssociation.id
              association.association_type = 'contact'
            } else {
              association.association_type = 'contact'
            }

            return association
          })


          /***  Handle reminders (Completed)  ***/
          const liveReminders = task.reminders || []
          const oldReminders  = tasksByGoogleId[gid].reminders
          const byTimestamp   = _.keyBy(oldReminders, 'timestamp')

          // @ts-ignore
          task.reminders = liveReminders.map(r => {
            const reminder = { timestamp: r.timestamp }

            if ( byTimestamp[r.timestamp] ) {
              reminder.id = byTimestamp[r.timestamp].id
              reminder.is_relative = byTimestamp[r.timestamp].is_relative
            } else {
              reminder.is_relative = r.is_relative
            }

            return reminder
          })

          return task
        }
      })
      await CrmTask.updateMany(toUpdateTasks, data.googleCredential.user)


      /***  Handle new CRM_TASK (Completed)  ***/
      const newTasks = confirmed.filter(event => { if (!updatedEventRemoteIds.includes(event.id)) return true }).map(event => {
        return {
          ...generateCrmTaskRecord(data.googleCredential, event),
          associations: associationsMap[event.id] || [],
          google_event_id: eventsByRemoteId[event.id].id
        }
      })
      await CrmTask.createMany(newTasks)


      /***  Handle Canceled(Deleted) Events (Completed)  ***/
      const google_event_ids = await GoogleCalendarEvent.deleteLocalByRemoteIds(calendar, canceledEventRemoteIds)
      const {ids} = await CrmTask.filter(data.googleCredential.user, data.googleCredential.brand, { google_event_ids })
      await CrmTask.remove(ids, data.googleCredential.user)


      /***  Update Calendar Sync Token (Completed)  ***/
      await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)
    }

    const totalEventsNum = await GoogleCalendarEvent.getGCredentialEventsNum(data.googleCredential.id)

    return  {
      status: true,
      ex: null,
      confirmedNum,
      totalNum: totalEventsNum[0]['count']
    }

  } catch (ex) {

    Context.log('SyncGoogle - syncCalendarEvents ex:', ex)

    return  {
      status: false,
      ex,
      confirmedNum,
      totalNum: 0
    }
  }
}



const test = async (req, res) => {
  const cid = '8edc420b-f9a1-45f9-b726-648ce1a83ced'

  const google = await getClient(cid)
  const googleCredential = await GoogleCredential.get(cid)

  const data = {
    googleCredential
  }

  const result = await syncCalendarEvents(google, data)

  return res.json(result)
}

module.exports = {
  test
}