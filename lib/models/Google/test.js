const _   = require('lodash')
const Orm = require('./../Orm')
const Context = require('../Context')
const config  = require('../../config')

const GoogleCredential    = require('./credential')
const GoogleCalendar      = require('./calendar')
const GoogleCalendarEvent = require('./calendar_events')
const Contact             = require('./../Contact')
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
  const canceledEventRemoteIds = []

  for ( const event of cancelled ) {
    canceledEventRemoteIds.push(event.id)
  }

  const confirmedRemoteIds = confirmed.map(e => e.id)
  const oldGoogleEvents    = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(calendar, confirmedRemoteIds)

  const oldEventsRemoteIds = oldGoogleEvents.map(c => c.event_id)
  const oldEventsByEventId = _.groupBy(oldGoogleEvents, 'event_id')

  console.log('--- oldEventsRemoteIds', oldEventsRemoteIds)
  console.log('--- oldEventsByEventId', oldEventsByEventId)

  const updatedEventRemoteIds = []
  const updatedEventIds       = []

  for (const event of confirmed) {
    if ( oldEventsRemoteIds.includes(event.id) ) {
      updatedEventRemoteIds.push(event.id)
      updatedEventIds.push(oldEventsByEventId[event.id][0].id)
    }
  }

  console.log('------------ updatedEventIds', updatedEventIds)
  const resutl        = await CrmTask.filter(googleCredential.user, googleCredential.brand, { google_event_ids: updatedEventIds })
  console.log('------------ resutl', resutl)

  /*
    [
      {
        id: 'd5fad652-8198-460e-b091-5f837c6dd973',
        created_at: 1579025560.03432,
        updated_at: 1579025560.03432,
        deleted_at: null,
        title: 'Single Event',
        description: '',
        due_date: 1579132800,
        end_date: 1579219200,
        status: 'PENDING',
        task_type: 'Other',
        metadata: null,
        assignees: [ '8725b638-3b09-11e7-b651-0242ac110003' ],
        associations: null,
        files: null,
        reminders: [ '0de567d6-1e8f-44a7-a6ea-9846a7874416' ],
        brand: '2a640514-1fad-11e9-91dc-0a95998482ac',
        created_by: '8725b638-3b09-11e7-b651-0242ac110003',
        updated_by: null,
        type: 'crm_task'
      }
    ]
  */
  const crmTaskModels = await CrmTask.getAll(resutl.ids)
  console.log('------------ crmTaskModels', crmTaskModels)

  /*
    [
      {
        id: 'f011afec-7d59-42ed-bf2e-e66071a43c22',
        created_at: 1579025560.03432,
        updated_at: 1579025560.03432,
        deleted_at: null,
        title: 'Recurrent Event',
        description: 'This is descriptio',
        due_date: 1579046400,
        end_date: 1579132800,
        status: 'PENDING',
        task_type: 'Other',
        metadata: null,
        assignees: [ [Object] ],
        associations: null,
        reminders: [ [Object] ],
        brand: '2a640514-1fad-11e9-91dc-0a95998482ac',
        type: 'crm_task'
      },
    ]
  */
  Orm.setEnabledAssociations(['crm_task.associations', 'crm_task.assignees', 'crm_task.reminders'])
  const oldCrmTasks   = await Orm.populate({ models: crmTaskModels, associations: ['crm_task.associations', 'crm_task.assignees', 'crm_task.reminders'] })
  console.log('------------ oldCrmTasks', oldCrmTasks)


  const emails   = confirmed.filter(event => { if (event.attendees) return true }).flatMap(event => event.attendees.map(({email}) => email))
  const {ids}    = await Contact.fastFilter(googleCredential.brand, [{ attribute_type: 'email', value: emails, operator: 'any' }], {})
  const contacts = await Contact.getAll(ids)

  /*
    const contactsMap = {
      'a@rechat.com': c1,
      'b@rechat.com': c2,
      'c@rechat.com': null
    }
  */
  const contactsMap = {}
  for (const email of emails) {
    const c = contacts.find(contact => contact.emails.includes(email))
    contactsMap[email] = c.id
  }

  /*
    const associationsMap = {
      event_id_1: [{ contact: c1.id, association_type: 'contact' }],
      event_id_2: [{ contact: c2.id, association_type: 'contact' }],
    }
  */
  const associationsMap = {}
  for (const event of confirmed.filter(event => { if (event.attendees) return true })) {
    associationsMap[event.id] = event.attendees.map(attendee => ({
      association_type: 'contact',
      contact: contactsMap[attendee.email]
    }))
  }

  return {
    canceledEventRemoteIds,
    updatedEventRemoteIds,
    associationsMap
  }
}


const syncCalendarEvents = async (google, data) => {
  let confirmedNum    = 0
  let canceledNum     = 0
  let createdTasksNum = 0

  try {
    const toSyncRemoteCalendars = await getToSyncCalendars(data.googleCredential.id)

    // console.log('toSyncRemoteCalendars', toSyncRemoteCalendars)

    for ( const calendar of [toSyncRemoteCalendars[2]] ) {
      
      const newEvents     = []
      const newTasks      = []
      const toUpdateTasks = []

      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar)

      console.log('confirmed length', confirmed.length)
      console.log('cancelled length', cancelled.length)

      console.log('\nconfirmed', confirmed)

      canceledNum  += cancelled.length
      confirmedNum += confirmed.length

      const { canceledEventRemoteIds, updatedEventRemoteIds, associationsMap } = await setupMapping(data.googleCredential, calendar, confirmed, cancelled)

      console.log('canceledEventRemoteIds length', canceledEventRemoteIds.length)
      console.log('updatedEventRemoteIds length', updatedEventRemoteIds.length)
      console.log('associationsMap', associationsMap)


      /***  Handle Confirmed(Created/Updated) Events  ***/
      for ( const event of confirmed ) {
        newEvents.push(generateCalendarEventRecord(calendar, event))
      }

      // create or update
      const createdEvents = await GoogleCalendarEvent.bulkUpsert(newEvents)
      const createdEventsByEventId = _.groupBy(createdEvents, 'event_id')
      console.log('createdEventsByEventId', createdEventsByEventId)


      /***  Create / Update CRM_TASK records  ***/
      for (const event of confirmed) {
        if ( updatedEventRemoteIds.includes(event.id) ) {

          // const task = generateCrmTaskRecord(data.googleCredential, event)
          // task.id = event.id
          // task.associations    = associationsMap[event.id] || []
          // task.google_event_id = createdEventsByEventId[event.id][0].id

          // toUpdateTasks.push(event.id)

        } else {

          const task = generateCrmTaskRecord(data.googleCredential, event)
          task.associations    = associationsMap[event.id] || []
          task.google_event_id = createdEventsByEventId[event.id][0].id
          newTasks.push(task)
        }
      }

      console.log('toUpdateTasks', toUpdateTasks)


      await CrmTask.updateMany(toUpdateTasks, data.googleCredential.user)
      const createdTasksIds = await CrmTask.createMany(newTasks)
      createdTasksNum += createdTasksIds.length

      console.log('----------- createdTasksIds', createdTasksIds)


      // return  { status: true, ex: null, confirmedNum, canceledNum, createdTasksNum }

      /***  Handle Canceled(Deleted) Events  ***/    
      const canceledGoogleEventIds = await GoogleCalendarEvent.deleteLocalByRemoteIds(calendar, canceledEventRemoteIds)
      console.log('----------- canceledGoogleEventIds', canceledGoogleEventIds)

      // const filterResutl = CrmTask.filter(data.googleCredential.user, data.googleCredential.brand, { google_event_ids: canceledGoogleEventIds })
      // await CrmTask.deleteMany(filterResutl.ids)


      /***  Update Calendar Sync Token  ***/
      await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)
    }

    return  {
      status: true,
      ex: null,
      confirmedNum,
      canceledNum,
      createdTasksNum,
    }

  } catch (ex) {

    Context.log('SyncGoogle - syncCalendarEvents ex:', ex)

    return  {
      status: false,
      ex,
      confirmedNum,
      canceledNum,
      createdTasksNum
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

  console.log('--- syncCalendarEvents result:', result)

  return res.json(result)
}

module.exports = {
  test
}