const Context = require('../Context')
const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const uuid    = require('node-uuid')

const GoogleCredential    = require('./credential')
const GoogleCalendarEvent = require('./calendar_events')
const { getMockClient, getGoogleClient } = require('./plugin/client.js')


const GoogleCalendar = {}

const SCOPE_GMAIL_READONLY = config.google_scopes.calendar[0]


/**
 * @param {UUID} credential_id 
 */
const getClient = async (credential_id) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  const credential = await GoogleCredential.get(credential_id)

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


GoogleCalendar.createLocal = async function (googleCredentialId, calendar) {
  return db.insert('google/calendar/insert',[
    googleCredentialId,
    calendar.id,
    calendar.summary || null,
    calendar.summaryOverride || null,
    calendar.description || null,
    calendar.location || null,
    calendar.timeZone || null,
    JSON.stringify(calendar.conferenceProperties),
    'owner',
    calendar.origin || 'rechat'
  ])
}

GoogleCalendar.updateLocal = async function (id, updatedCalendar) {
  return await db.selectIds('google/calendar/update', [
    id,
    updatedCalendar.summary || null,
    updatedCalendar.description || null,
    updatedCalendar.location || null,
    updatedCalendar.timeZone || null,
  ])
}

GoogleCalendar.persistRemoteCalendar = async function (googleCredentialId, remoteCalendar) {
  return db.insert('google/calendar/remote_insert',[
    googleCredentialId,
    remoteCalendar.id,
    remoteCalendar.summary || null,
    remoteCalendar.summary_override || null,
    remoteCalendar.description || null,
    remoteCalendar.location || null,
    remoteCalendar.timeZone || null,
    remoteCalendar.accessRole,
    remoteCalendar.selected || false,
    remoteCalendar.deleted || false,
    remoteCalendar.primary || false,
    JSON.stringify(remoteCalendar.defaultReminders),
    JSON.stringify(remoteCalendar.notificationSettings),
    JSON.stringify(remoteCalendar.conference_properties),
    'google'
  ])
}

/**
 * @param {UUID[]} ids
 */
GoogleCalendar.getAll = async (ids) => {
  return await db.select('google/calendar/get', [ids])
}

/**
 * @param {UUID} id
 */
GoogleCalendar.get = async (id) => {
  const calendars = await GoogleCalendar.getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Google calendar by id ${id} not found.`)

  return calendars[0]
}

/**
 * @param {String} channelId
 */
GoogleCalendar.getByWatcherChannelId = async (channelId) => {
  const ids = await db.selectIds('google/calendar/get_by_channel_id', [channelId])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google Calendar by channel ${channelId} not found.`)

  return await GoogleCalendar.get(ids[0])
}

/**
 * @param {UUID} googleCredentialId
 */
GoogleCalendar.getAllByGoogleCredential = async (googleCredentialId) => {
  const ids = await db.selectIds('google/calendar/get_by_credential', [googleCredentialId])

  if (ids.length < 1)
    return []

  return await GoogleCalendar.getAll(ids)
}

/**
 * @param {UUID} id
 * @param {String} syncToken 
 */
GoogleCalendar.updateSyncToken = async (id, syncToken) => {
  return await db.selectId('google/calendar/update_sync_token', [id, syncToken])
}

/**
 * @param {UUID} googleCredentialId
 * @param {String} remoteCalendarId 
 */
GoogleCalendar.getByRemoteCalendarId = async (googleCredentialId, remoteCalendarId) => {
  const ids = await db.selectIds('google/calendar/get_by_remote_cal', [googleCredentialId, remoteCalendarId])

  if ( ids.length === 0 )
    throw Error.ResourceNotFound(`Google calendar by id ${remoteCalendarId} not found.`)

  return await GoogleCalendar.get(ids[0])
}

/**
 * @param {UUID} googleCredentialId
 * @param {String} remoteCalendarId 
 */
GoogleCalendar.deleteLocalByRemoteCalendarId = async function (googleCredentialId, remoteCalendarId) {
  await db.select('google/calendar/delete_by_remote_cal_id', [googleCredentialId, remoteCalendarId])
}

/**
 * @param {UUID} googleCredentialId
 * @param {String[]} remoteCalendarIds 
 */
GoogleCalendar.stopSync = async (googleCredentialId, remoteCalendarIds = []) => {
  return await db.selectIds('google/calendar/stop_sync', [googleCredentialId, remoteCalendarIds])
}

GoogleCalendar.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
}


GoogleCalendar.listRemoteCalendars = async function (googleCredentialId) {
  const google = await getClient(googleCredentialId)
  const result = await google.listCalendars()

  const calendars = []

  for ( const cal of result.items ) {
    if( cal.summary.toLowerCase() !== 'contacts' )
      calendars.push(cal)
  }

  return calendars
}

GoogleCalendar.persistRemoteCalendars = async (googleCredentialId, toSyncRemoteCalendarIds = []) => {
  const remoteCalendars    = await GoogleCalendar.listRemoteCalendars(googleCredentialId)
  const createdCalendarIds = []

  for ( const remoteCalendar of remoteCalendars ) {
    if ( toSyncRemoteCalendarIds.includes(remoteCalendar.id) ) {

      if ( remoteCalendar.deleted ) {
        try {
          const cal = await GoogleCalendar.getByRemoteCalendarId(googleCredentialId, remoteCalendar.id)
          await GoogleCalendar.deleteLocalByRemoteCalendarId(googleCredentialId, remoteCalendar.id)
          await GoogleCalendarEvent.deleteLocalByRemoteCalendarId(googleCredentialId, cal.id)
        } catch (err) {
          // do nothing
        }
      } else {

        const id = await GoogleCalendar.persistRemoteCalendar(googleCredentialId, remoteCalendar)
        createdCalendarIds.push(id)
      }
    }
  }

  return createdCalendarIds
}

GoogleCalendar.create = async (googleCredentialId, body) => {
  /* body: {
    summary: 'summary',
    description: 'description',
    location: 'location' 
    timeZone: 'Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich"'
  }*/
  
  const google   = await getClient(googleCredentialId)
  const calendar = await google.createCalendar(body)

  return await GoogleCalendar.createLocal(googleCredentialId, calendar)
}

GoogleCalendar.getRemoteGoogleCalendars = async (googleCredential) => {
  const sameOwnerRemoteCalendarIds = await db.select('google/calendar/get_same_owner_rechat_gcalendars', [googleCredential.email, googleCredential.brand])
  const remoteCalendars            = await GoogleCalendar.listRemoteCalendars(googleCredential.id)
  const currentSyncedCalendars     = await GoogleCalendar.getAllByGoogleCredential(googleCredential.id)

  const currentSyncedRemoteCalendarIds = currentSyncedCalendars.map(record => record.calendar_id)

  let currentRechatRemoteCalendarId = null

  try {
    const currentRechatCalendar = await GoogleCalendar.get(googleCredential.rechat_gcalendar)

    if(currentRechatCalendar)
      currentRechatRemoteCalendarId = currentRechatCalendar.calendar_id
  } catch(err) {
    // do nothing
  }

  let currentSelectedCal = null

  const readWrite = []
  const readOnly  = []

  for ( const remoteCalendar of remoteCalendars ) {

    /*
      Current gmail_address could be connected through other brands
      Every connected_accounts in any specific brand could have a unique rechat_google_calendar
      So we exclude these remote rechat_google_calendars
    */
    if ( !sameOwnerRemoteCalendarIds.includes(remoteCalendar.id) ) {

      const cal = {
        id: remoteCalendar.id,
        summary: remoteCalendar.summary || null,
        summaryOverride: remoteCalendar.summaryOverride || null,
        description: remoteCalendar.description || null,
        primary: remoteCalendar.primary  || false,
        accessRole: remoteCalendar.accessRole,
        alreadySynced: currentSyncedRemoteCalendarIds.includes(remoteCalendar.id) ? true : false
      }

      if ( remoteCalendar.id === currentRechatRemoteCalendarId )
        currentSelectedCal = remoteCalendar
      else if ( remoteCalendar.accessRole === 'reader' )
        readOnly.push(cal)
      else if ( remoteCalendar.accessRole === 'writer' || remoteCalendar.accessRole === 'owner' )
        readWrite.push(cal)
    }
  }

  return { readWrite, readOnly, currentSelectedCal }
}

GoogleCalendar.configureCaledars = async (googleCredentialId, conf) => {
  /*
    conf: {
      rechatCalendar: {
        type: 'new',
        body: {
          summary: 'summary',
          description: 'description',
          location: 'Montreal',
          timeZone: 'America/Chicago'
        }
      },
      toSync: [x,y,z]
    }

    conf: {
      rechatCalendar: {
        type: 'old',
        id: 'my_custom_cal',
      },
      toSync: [x,y,z]
    }

    conf: {
      toSync: ['heshmat.zapata@gmail.com'],
      toStopSync: ['saeed.uni68@gmail.com']
    }
  */

  if (conf.toStopSync)
    await GoogleCalendar.stopSync(googleCredentialId, conf.toStopSync)

  if (conf.rechatCalendar) {

    let rechatCalendarId = null

    if ( conf.rechatCalendar.type === 'new' ) {
      rechatCalendarId = await GoogleCalendar.create(googleCredentialId, conf.rechatCalendar.body)
  
    } else {
  
      const google         = await getClient(googleCredentialId)
      const remoteCalendar = await google.getCalendarList(conf.rechatCalendar.id)
  
      if ( !remoteCalendar )
        throw Error.BadRequest(`Calendar ${conf.rechatCalendar.id} not found!`)
  
      if ( remoteCalendar.accessRole === 'reader' )
        throw Error.BadRequest(`Calendar ${remoteCalendar.summary} has not write access!`)
  
      const calendar = {
        id: remoteCalendar.id,
        summary: remoteCalendar.summary,
        summaryOverride: remoteCalendar.summaryOverride,
        description: remoteCalendar.description,
        location: remoteCalendar.location,
        timeZone: remoteCalendar.timeZone,
        conferenceProperties: remoteCalendar.conferenceProperties || [],
        origin: 'google'
      }
  
      rechatCalendarId = await GoogleCalendar.createLocal(googleCredentialId, calendar)
    }

    await GoogleCredential.updateRechatGoogleCalendar(googleCredentialId, rechatCalendarId)
  }

  if (conf.toSync)
    await GoogleCalendar.persistRemoteCalendars(googleCredentialId, conf.toSync)
  
  return
}

GoogleCalendar.update = async (googleCredentialId, body) => {
  const google     = await getClient(googleCredentialId)
  const credential = await GoogleCredential.get(googleCredentialId)
  console.log('credential', credential)

  if (!credential.rechat_gcalendar)
    throw Error.ResourceNotFound('Rechat Google-Calendar is not created yet!')

  const calendar = await GoogleCalendar.get(credential.rechat_gcalendar)
  console.log('calendar', calendar)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${credential.rechat_gcalendar} not found.`)

  const updatedCalendar = await google.updateCalendar(calendar.calendar_id, body)
  console.log('updatedCalendar', updatedCalendar)

  return await GoogleCalendar.updateLocal(calendar.id, updatedCalendar)
}

GoogleCalendar.watch = async (id) => {
  const calendar = await GoogleCalendar.get(id)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${id} not found.`)

  const google = await getClient(calendar.google_credential)

  const options = {
    calendarId: calendar.calendar_id,
    requestBody: {
      id: uuid.v4(), // x-goog-channel-id or result.id or watcher_channel_id
      token: calendar.id, // x-goog-channel-token
      type: 'web_hook',
      address: `https://${process.env.API_HOSTNAME}/users/google/calendars/hook`,
    }
  }
  
  /*
    Currently there is no automatic way to renew a notification channel. When a channel is close to its expiration,
    you must create a new one by calling the watch method. As always, you must use a unique value for the id property of the new channel.
    Note that there is likely to be an "overlap" period of time when the two notification channels for the same resource are active.

    options {
      calendarId: 'heshmat.zapata@gmail.com',
      requestBody: {
        id: 'dfb33480-f69e-11e9-80ac-6393ef7eedb4', // x-goog-channel-id
        token: 'calendar.google_credential', // x-goog-channel-token
        type: 'web_hook',
        address: 'https://boer.api.rechat.com/webhook/google/calendar'
      }
    }
    result {
      kind: 'api#channel',
      id: 'dfb33480-f69e-11e9-80ac-6393ef7eedb4', // x-goog-channel-id
      token: 'calendar.google_credential', // x-goog-channel-token
      resourceId: 'SuelP1-rnXotZ_B6hLvI70BRFPo', // x-goog-resource-id

      resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/heshmat.zapata@gmail.com/events?maxResults=250&alt=json',
      expiration: '1572554586000'
    }
  */
  const result = await google.watchCalendar(options)

  Context.log('GoogleCalendar watch options', options)
  Context.log('GoogleCalendar watch result', result)

  return await db.select('google/calendar/update_watcher', [calendar.id, 'active', result.id, JSON.stringify(result)])
}

GoogleCalendar.stopWatch = async (id) => {
  const calendar = await GoogleCalendar.get(id)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${id} not found.`)

  const google = await getClient(calendar.google_credential)

  if ( calendar.watcher_status === 'stopped' )
    throw Error.BadRequest('Already Stopped!')

  const options = {
    requestBody: {
      id: calendar.watcher.id, // x-goog-channel-id
      resourceId: calendar.watcher.resourceId // x-goog-resource-id
    }
  }

  await google.stopWatchCalendar(options)

  return await db.select('google/calendar/update_watcher', [calendar.id, 'stopped', null, JSON.stringify({})])
}

GoogleCalendar.syncCalendar = async (channelId, calendarId) => {
  const calendar = await GoogleCalendar.getByWatcherChannelId(channelId)

  if ( calendar.id !== calendarId )
    throw Error.BadRequest('Bad x-goog-channel-token')

  Context.log('GoogleCalendar syncCalendar', calendar)

  // Push sync job ???

  return true
}


Orm.register('google_calendar', 'GoogleCalendar', GoogleCalendar)

module.exports = GoogleCalendar