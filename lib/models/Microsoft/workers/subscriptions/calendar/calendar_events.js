const _ = require('lodash')

const config  = require('../../../../../config')
const Orm     = require('../../../../Orm')
const Context = require('../../../../Context')

const CalendarIntegration    = require('../../../../CalendarIntegration')
const MicrosoftSubscription  = require('../../../subscription')
const MicrosoftCalendarEvent = require('../../../calendar_events')
const MicrosoftCalendar      = require('../../../calendar')
const Contact = require('../../../../Contact')
const User    = require('../../../../User')
const CrmTask = require('../../../../CRM/Task/index')

const getClient = require('../../../client')
const { subscribe, updateSub } = require('../common')
const { fetchEvents } = require('./common')

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
  const oldMicrosoftEvents    = await MicrosoftCalendarEvent.getByCalendarAndEventRemoteIds(calendar, confirmedRemoteIds)

  const oldEventsRemoteId  = oldMicrosoftEvents.map(c => c.event_id)
  const oldEventsByEventId = _.keyBy(oldMicrosoftEvents, 'event_id')

  const deletedEventRemoteIds = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id) && oldEventsByEventId[event.id].deleted_at) return true }).map(event => event.id)
  const updatedEventRemoteIds = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id) && !oldEventsByEventId[event.id].deleted_at && (oldEventsByEventId[event.id].etag !== event.etag)) return true }).map(event => event.id)
  const microsoft_event_ids      = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id)) return true }).map(event => oldEventsByEventId[event.id].id)

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
  const emails   = confirmed.filter(event => { if (event.attendees) return true }).flatMap(event => event.attendees.map(({email}) => email))
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
    oldEventsRemoteId,
    deletedEventRemoteIds,
    updatedEventRemoteIds,
    tasksByMicrosoftId,
    associationsMap
  }
}

const syncCalendarEvents = async (microsoft, credential) => {
  let confirmedNum = 0

  try {
    const toSyncRemoteCalendars = await getToSyncCalendars(credential.id)
    
    for ( const calendar of toSyncRemoteCalendars ) {
      const { confirmed, cancelled, delta } = await fetchEvents(microsoft, calendar)

      if ( confirmed.length === 0 && cancelled.length === 0 && delta) {
        await MicrosoftCalendar.updateDeltaToken(calendar.id, delta)
        continue
      }

      const { oldEventsRemoteId, deletedEventRemoteIds, updatedEventRemoteIds, tasksByMicrosoftId, associationsMap } = await setupMapping(credential, calendar, confirmed, cancelled)

      // confirmedNum += confirmed.length

      // const normalEvents   = confirmed.filter(c => !deletedEventRemoteIds.includes(c.id) )
      // const restoredEvents = confirmed.filter(c => deletedEventRemoteIds.includes(c.id) )


      /***  Handle Confirmed(Created/Updated) Events ***/
      // const eventsByRemoteId = await hadnleConfirmedEvents(calendar, confirmed, oldEventsRemoteId, updatedEventRemoteIds, deletedEventRemoteIds)


      /***  Update CRM_TASK records  ***/
      // await updateCrmTasks(credential, updatedEventRemoteIds, eventsByRemoteId, associationsMap, tasksByMicrosoftId, normalEvents)


      /***  Restore CRM_TASK records  ***/
      // await restoreEvents(credential, restoredEvents, eventsByRemoteId, associationsMap)


      /***  Handle new CRM_TASK  ***/
      // await handleNewCrmTasks(credential, oldEventsRemoteId, eventsByRemoteId, associationsMap, normalEvents)


      /***  Handle Canceled(Deleted) Events  ***/
      // await hadnleCanceledEvents(credential, calendar, cancelled)


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

    Context.log('SyncMicrosoftCalendar - syncCalendarEvents ex:', ex)

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