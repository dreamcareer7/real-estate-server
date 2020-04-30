const _ = require('lodash')

const config  = require('../../../../../config')
const Orm     = require('../../../../Orm')
const Context = require('../../../../Context')

const GoogleCredential       = require('../../../../Google/credential')
const MicrosoftCredential    = require('../../../credential')
const CalendarIntegration    = require('../../../../CalendarIntegration')
const MicrosoftCalendarEvent = require('../../../calendar_events')
const MicrosoftCalendar      = require('../../../calendar')
const Contact = require('../../../../Contact')
const User    = require('../../../../User')
const CrmTask = require('../../../../CRM/Task/index')

const { generateCalendarEvent, generateCrmTask, fetchEvents } = require('./common')

const _REASON = config.microsoft_integration.crm_task_update_reason



const getToSyncCalendars = async function (gcid) {
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(gcid)

  return  calendars.filter(cal => ( cal.to_sync && !cal.deleted_at ))
}

const setupMapping = async (credential, calendar, confirmed, cancelled) => {
  Context.log('SyncMicrosoftCalendar', credential.id, calendar.id, 'confirmed.length', confirmed.length)
  Context.log('SyncMicrosoftCalendar', credential.id, calendar.id, 'cancelled.length', cancelled.length)

  const associations = ['crm_task.associations', 'crm_task.assignees', 'crm_task.reminders', 'crm_association.contact']

  // Find old microsoft calendar events
  const confirmedRemoteIds = confirmed.map(e => e.id)
  const oldMicrosoftEvents = await MicrosoftCalendarEvent.getByCalendarAndEventRemoteIds(calendar, confirmedRemoteIds)

  const oldEventsRemoteId  = oldMicrosoftEvents.map(c => c.event_id)
  const oldEventsByEventId = _.keyBy(oldMicrosoftEvents, 'event_id')

  const deletedEventRemoteIds = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id) && oldEventsByEventId[event.id].deleted_at) return true }).map(event => event.id)
  const updatedEventRemoteIds = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id) && !oldEventsByEventId[event.id].deleted_at && (oldEventsByEventId[event.id].change_key !== event.changeKey)) return true }).map(event => event.id)
  const microsoft_event_ids   = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id)) return true }).map(event => oldEventsByEventId[event.id].id)

  // Find old crm_tasks
  const user = await User.get(credential.user)
  Context.set({user})
  Orm.setEnabledAssociations(associations)


  const records = await CalendarIntegration.getByMicrosoftIds(microsoft_event_ids)

  const taskIds   = records.map(record => record.crm_task)
  const byCrmTask = _.keyBy(records, 'crm_task')

  const models = await CrmTask.getAll(taskIds)
  const tasks  = await Orm.populate({ models, associations })

  const refinedTasks = tasks.map(task => {
    return {
      ...task,
      microsoft_event_id: byCrmTask[task.id].microsoft_id
    }
  })

  const tasksByMicrosoftId = _.keyBy(refinedTasks, 'microsoft_event_id')


  // find associations to create associationsMap
  const emails   = confirmed.filter(event => { if (event.attendees) return true }).flatMap(event => event.attendees.map(attendee => { if (attendee.emailAddress && attendee.emailAddress.address) return attendee.emailAddress.address }))
  const {ids}    = await Contact.fastFilter(credential.brand, [{ attribute_type: 'email', value: emails, operator: 'any' }], {})
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
    const c = contacts.find(contact => (contact.emails && contact.emails.includes(email)))
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
    associationsMap[event.id] = event.attendees.filter(attendee => { if ( attendee.emailAddress && attendee.emailAddress.address && contactsMap[attendee.emailAddress.address]) return true }).map(attendee => {
      return {
        association_type: 'contact',
        contact: contactsMap[attendee.emailAddress.address]
      }
    })
  }


  return {
    oldEventsRemoteId,
    deletedEventRemoteIds,
    updatedEventRemoteIds,
    tasksByMicrosoftId,
    associationsMap
  }
}

const hadnleConfirmedEvents = async (calendar, confirmed, oldEventsRemoteId, updatedEventRemoteIds, deletedEventRemoteIds) => {
  // Concat these to arrays to support both updated and restored events
  const temp = updatedEventRemoteIds.concat(deletedEventRemoteIds)

  const filterd = confirmed.filter(c => { if ( !oldEventsRemoteId.includes(c.id) || temp.includes(c.id)) return true })
  const events  = filterd.map(event => generateCalendarEvent(calendar, event))

  const result  = await MicrosoftCalendarEvent.bulkUpsert(events)

  return _.keyBy(result, 'event_id')
}

const restoreEvents = async (credential, restoredEvents, eventsByRemoteId, associationsMap) => {
  const newTasks = restoredEvents.map(event => {
    return {
      ...generateCrmTask(credential, event),
      associations: associationsMap[event.id] || [],
      metadata: {
        all_day: event.isAllDay
      }
    }
  })

  const createdTaskIds = await CrmTask.createMany(newTasks, _REASON)

  let i = 0
  const toUpdateCalIntRecords = restoredEvents.map(event => {
    return {
      microsoft_id: eventsByRemoteId[event.id].id,
      etag: event.changeKey,
      local_etag: event.changeKey,
      crm_task: createdTaskIds[i++]
    }
  })

  await CalendarIntegration.mupsert(toUpdateCalIntRecords)

  return
}

const updateCrmTasks = async (credential, updatedEventRemoteIds, eventsByRemoteId, associationsMap, tasksByMicrosoftId, events) => {
  if ( events.length === 0 ) {
    return
  }

  const toUpdateTasks = events.filter(event => { if (updatedEventRemoteIds.includes(event.id)) return true }).map(event => {
    const mid = eventsByRemoteId[event.id].id
    const tid = tasksByMicrosoftId[mid].id

    if (tid) {
      const task = generateCrmTask(credential, event)

      task.id = tid

      task.metadata = tasksByMicrosoftId[mid].metadata
      task.metadata ? (task.metadata.all_day = event.isAllDay) : (task.metadata = { all_day: event.isAllDay })

      const liveAssociations = associationsMap[event.id] || []
      const oldAssociations  = tasksByMicrosoftId[mid].associations
      const oldContacts      = tasksByMicrosoftId[mid].contacts || []

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
      const oldReminders  = tasksByMicrosoftId[mid].reminders
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

  const toUpdateCalIntRecords = events.filter(event => { if (updatedEventRemoteIds.includes(event.id)) return true }).map(event => {
    return {
      microsoft_id: eventsByRemoteId[event.id].id,
      etag: event.changeKey,
      local_etag: event.changeKey,
      crm_task: null
    }
  })

  await CrmTask.updateMany(toUpdateTasks, credential.user, _REASON)
  await CalendarIntegration.mupsert(toUpdateCalIntRecords)

  return
}

const handleNewCrmTasks = async (credential, oldEventsRemoteId, eventsByRemoteId, associationsMap, confirmed) => {
  if ( confirmed.length === 0 ) {
    return
  }

  const filterdEvents = confirmed.filter(event => { if (!oldEventsRemoteId.includes(event.id)) return true })
  const newTasks = filterdEvents.map(event => {
    return {
      ...generateCrmTask(credential, event),
      associations: associationsMap[event.id] || [],
      metadata: {
        all_day: event.isAllDay
      }
    }
  })

  const createdTaskIds = await CrmTask.createMany(newTasks, _REASON)

  let i = 0
  const records = filterdEvents.map(event => {
    return {
      google_id: null,
      microsoft_id: eventsByRemoteId[event.id].id,

      crm_task: createdTaskIds[i++],
      contact: null,
      contact_attribute: null,
      deal_context: null,

      object_type: 'crm_task',
      event_type: 'Other',
      origin: (event.extendedProperties && event.extendedProperties.shared) ? ( ( !event.extendedProperties.shared.origin ? 'microsoft' : event.extendedProperties.shared.origin ) ) : 'microsoft',
      etag: event.changeKey,
      local_etag: event.changeKey
    }
  })

  await CalendarIntegration.insert(records)
}

const hadnleCanceledEvents = async (credential, calendar, cancelled) => {
  if ( cancelled.length === 0 ) {
    return
  }

  const canceledEventRemoteIds = cancelled.map(event => event.id)

  const ids     = await MicrosoftCalendarEvent.deleteLocalByRemoteIds(calendar, canceledEventRemoteIds)
  const records = await CalendarIntegration.getByMicrosoftIds(ids)

  const taskIds   = records.map(record => record.crm_task)
  const recordIds = records.map(record => record.id)

  await CalendarIntegration.deleteMany(recordIds)
  await CrmTask.remove(taskIds, credential.user, _REASON)
}

const getSameBrandEmails = async (brand) => {
  const gCredentials = await GoogleCredential.getByBrand(brand)
  const mCredentials = await MicrosoftCredential.getByBrand(brand)

  const emails = []

  gCredentials.forEach(function(record) {
    emails.push(record.email)
  })

  mCredentials.forEach(function(record) {
    emails.push(record.email)
  })

  return emails
}

const syncCalendarEvents = async (microsoft, credential, timeZone) => {
  let confirmedNum = 0

  try {
    const sameBrandEmails       = await getSameBrandEmails(credential.brand)
    const toSyncRemoteCalendars = await getToSyncCalendars(credential.id)
    
    for ( const calendar of toSyncRemoteCalendars ) {
      const { confirmed, cancelled, delta } = await fetchEvents(microsoft, calendar, sameBrandEmails, timeZone)

      if ( confirmed.length === 0 && cancelled.length === 0 && delta) {
        await MicrosoftCalendar.updateDeltaToken(calendar.id, delta)
        continue
      }

      const { oldEventsRemoteId, deletedEventRemoteIds, updatedEventRemoteIds, tasksByMicrosoftId, associationsMap } = await setupMapping(credential, calendar, confirmed, cancelled)

      confirmedNum += confirmed.length

      const normalEvents   = confirmed.filter(c => !deletedEventRemoteIds.includes(c.id) )
      const restoredEvents = confirmed.filter(c => deletedEventRemoteIds.includes(c.id) )


      /***  Handle Confirmed(Created/Updated) Events ***/
      const eventsByRemoteId = await hadnleConfirmedEvents(calendar, confirmed, oldEventsRemoteId, updatedEventRemoteIds, deletedEventRemoteIds)


      /***  Update CRM_TASK records  ***/
      await updateCrmTasks(credential, updatedEventRemoteIds, eventsByRemoteId, associationsMap, tasksByMicrosoftId, normalEvents)


      /***  Restore CRM_TASK records  ***/
      await restoreEvents(credential, restoredEvents, eventsByRemoteId, associationsMap)


      /***  Handle new CRM_TASK  ***/
      await handleNewCrmTasks(credential, oldEventsRemoteId, eventsByRemoteId, associationsMap, normalEvents)


      /***  Handle Canceled(Deleted) Events  ***/
      await hadnleCanceledEvents(credential, calendar, cancelled)


      /***  Update Calendar Sync Token  ***/
      await MicrosoftCalendar.updateDeltaToken(calendar.id, delta)
    }

    const totalEventsNum = await MicrosoftCalendarEvent.getMCredentialEventsNum(credential.id)

    return  {
      status: true,
      ex: null,
      confirmedNum,
      totalNum: totalEventsNum[0]['count']
    }

  } catch (ex) {

    Context.log('SyncMicrosoftCalendar - syncCalendarEvents ex:', ex.message)

    return  {
      status: false,
      ex,
      confirmedNum,
      totalNum: 0
    }
  }
}


module.exports = {
  syncCalendarEvents
}