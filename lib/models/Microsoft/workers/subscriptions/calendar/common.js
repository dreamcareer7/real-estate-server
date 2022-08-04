const { keyBy } = require('lodash')

const config  = require('../../../../../config')
const Context = require('../../../../Context')

const openExt = config.microsoft_integration.openExtension

const MicrosoftCalendar = require('../../../calendar')



const createDateAsUTC = function (ts) {
  const date = new Date(ts)

  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()))

  /*
    convertDateToUTC:
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
  */
}

const getEvents = async function (microsoft, calendar, timeZone) {
  const oneYearBefore = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  const tenYearsAfter = new Date(new Date().setFullYear(new Date().getFullYear() + 10))

  const startdatetime = oneYearBefore.toISOString()
  const enddatetime   = tenYearsAfter.toISOString()

  const initialLink = `https://graph.microsoft.com/v1.0/me/calendars/${calendar.calendar_id}/calendarView/delta?startdatetime=${startdatetime}&enddatetime=${enddatetime}`
  const url = calendar.delta_token ? calendar.delta_token : initialLink

  // overwrite timeZone
  timeZone = 'UTC'

  return await microsoft.delta(url, timeZone)
}

const getExtended = async function (microsoft, calendar, events, populated = false) {
  const select   = '$select=id,subject'
  const expand   = `$expand=extensions($filter=id eq '${openExt.calendar.name}')`
  const query    = populated ? `?${expand}` : `?${select}&${expand}`
  const eventIds = events.map(event => event.id)

  let counter = 1

  const chunks = eventIds.map(id => {
    return {
      'id': counter++,
      'method': 'GET',
      'url': `/me/calendars/${calendar.calendar_id}/events/${id}/${query}`,
      'headers': {
        'Prefer': 'outlook.timezone="UTC"'
      }
    }
  })

  const result   = await microsoft.batchGetEvents(chunks)
  const extended = result.filter(record => (record.status === 200)).map(record => record.body)
  const byId     = keyBy(extended, 'id')

  return byId
}


const generateCalendarEvent = function (calendar, event) {
  return {
    microsoft_credential: calendar.microsoft_credential,
    microsoft_calendar: calendar.id,
    event_id: event.id,
    subject: event.subject,
    type: event.type,
    change_key: event.changeKey,

    created_date_time: event.createdDateTime,
    last_modified_date_time: event.lastModifiedDateTime,
    original_end_time_zone: event.originalEndTimeZone,
    original_start_time_zone: event.originalStartTimeZone,
    event_start: JSON.stringify(event.start),
    event_end: JSON.stringify(event.end),

    body: JSON.stringify(event.body),
    attendees: JSON.stringify(event.attendees),
    recurrence: JSON.stringify(event.recurrence),
    is_all_day: event.isAllDay,
    is_cancelled: event.isCancelled,
    is_organizer: event.isOrganizer,
    reminder_minutes_before_start: event.reminderMinutesBeforeStart,

    location: JSON.stringify(event.location),
    locations: JSON.stringify(event.locations),
    organizer: JSON.stringify(event.organizer),
    categories: JSON.stringify(event.categories),
    response_status: JSON.stringify(event.responseStatus),
    extensions: JSON.stringify(event.extensions),

    has_attachments: event.hasAttachments,
    is_reminder_on: event.isReminderOn,
    response_requested: event.responseRequested,
    ical_uid: event.iCalUId,
    importance: event.importance,
    online_meeting_url: event.onlineMeetingUrl,
    sensitivity: event.sensitivity,
    series_master_id: event.seriesMasterId,
    show_as: event.showAs,
    web_link: event.webLink,
    origin: 'microsoft'
  }
}

/** @returns {RequireProp<ITaskInput, 'brand' | 'created_by'>} */
const generateCrmTask = function (credential, event) {
  const dueDate = createDateAsUTC(event.start.dateTime).getTime() / 1000
  const endDate = createDateAsUTC(event.end.dateTime).getTime() / 1000

  /***  Handle reminders  ***/
  let reminders = []

  if ( !event.isReminderOn && event.reminderMinutesBeforeStart ) {
    reminders = [{
      is_relative: true,
      timestamp: dueDate - (event.reminderMinutesBeforeStart * 60)
    }]
  }

  return {
    brand: credential.brand,
    created_by: credential.user,
    title: event.subject || 'No-Title',
    description: event.body ? ( event.body.contentType === 'html' ? event.body.content : '' ) : '',
    due_date: dueDate,
    end_date: (dueDate === endDate) ? undefined : endDate,
    status: (dueDate > ( new Date().getTime() / 1000 )) ? 'PENDING' : 'DONE',
    task_type: 'Other',
    assignees: [credential.user],
    reminders: reminders,
    associations: []
  }
}

const fetchEvents = async function (microsoft, calendar, sameBrandEmails, timeZone) {
  const confirmed = []
  const cancelled = []
  const masters = []

  const confirmedSet  = new Set()
  const cancelledSet  = new Set()
  const masterIdsSet  = new Set()

  try {
    const { delta, values } = await getEvents(microsoft, calendar, timeZone)
    const extendedById      = await getExtended(microsoft, calendar, values, true)
    for (const event of values) {
      if( event['@removed'] || event.isCancelled ) {
        if (!cancelledSet.has(event.id)) {
          cancelledSet.add(event.id)
          cancelled.push(event)
        }

        continue
      }
  
      // Skip invitation events which are created by another Google or Outlook account which is already connected with same brand
      if ( !event.is_organizer && event.organizer && event.organizer.emailAddress ) {
        if ( sameBrandEmails.includes(event.organizer.emailAddress.address) ) {
          continue
        }
      }
  
      if (extendedById[event.id]) {
        event.extensions = extendedById[event.id].extensions || []
  
        const byId = keyBy(event.extensions, 'id')
        const ext  = byId[openExt.calendar.id]
  
        if ( ext && ext.shared && ext.origin === 'rechat' && ext.object_type !== 'crm_task' ) {
          continue
        }
   
        // skip seriesMaster events
        if ( event.type === 'seriesMaster' ) {
          if (!masterIdsSet.has(event.id)) {
            masterIdsSet.add(event.id)
            masters.push(event)
          }

          continue
        }
  

        if (!confirmedSet.has(event.id)) {
          confirmedSet.add(event.id)
          confirmed.push(extendedById[event.id])
        }
      }
    }
  
    return {
      confirmed,
      cancelled,
      masters,
      delta
    }

  } catch (ex) {

    /*
      This is a quick fix for the below error: 410 - The sync state generation is not found
      more info: https://stackoverflow.com/questions/51933002/syncstatenotfound-error-how-to-fix-or-avoid
    */
    if ( ex.statusCode === 410 ) {
      await MicrosoftCalendar.updateDeltaToken(calendar.id, null)
    }

    if ( ex.statusCode === 504 || ex.statusCode === 410 ) {
      return {
        confirmed,
        cancelled,
        delta: null
      }
    }

    throw ex
  }
}



module.exports = {
  generateCalendarEvent,
  generateCrmTask,
  fetchEvents
}