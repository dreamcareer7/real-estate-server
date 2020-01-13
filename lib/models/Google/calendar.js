const uuid = require('node-uuid')
const _    = require('lodash')

const Context = require('../Context')
const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')

const GoogleCredential    = require('./credential')
const GoogleCalendarEvent = require('./calendar_events')
const { getMockClient, getGoogleClient } = require('./plugin/client.js')


const GoogleCalendar = {}

const SCOPE_GMAIL_READONLY = config.google_scopes.calendar[0]


/**
 * @param {UUID} cid google_credential_id
 */
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

const handleRemoteDeletedCalendar = async (cal) => {
  await GoogleCalendar.deleteLocalByRemoteCalendarId(cal)
  await GoogleCalendarEvent.deleteLocalByCalendar(cal)
  await GoogleCalendar.stopWatchCalendar(cal)
}

const createRechatRemoteCal = async (credential) => {
  const body = {
    summary: 'Rechat',
    description: 'Rechat Google Calendar'
  }

  const rechatCalendarId = await GoogleCalendar.create(credential.id, body)
  await GoogleCredential.updateRechatGoogleCalendar(credential.id, rechatCalendarId)

  const offlineCal = await GoogleCalendar.get(rechatCalendarId)
  await GoogleCalendar.watchCalendar(offlineCal)

  return
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
    return null

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
    return null

  return await GoogleCalendar.get(ids[0])
}

/**
 * @param {Object} calendar 
 */
GoogleCalendar.deleteLocalByRemoteCalendarId = async function (calendar) {
  await db.select('google/calendar/delete_by_remote_cal_id', [calendar.google_credential, calendar.calendar_id])
}

/**
 * @param {UUID} id
 * @param {UUID} channelId
 * @param {String} status
 * @param {Object} result
 */
GoogleCalendar.updateWatcher = async (id, channelId, status, result = {}) => {
  return await db.select('google/calendar/update_watcher', [id, status, channelId, JSON.stringify(result)])
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
  const createdCalendarIds = []

  const remoteCalendars     = await GoogleCalendar.listRemoteCalendars(googleCredentialId)
  const remoteCalendarsById = _.groupBy(remoteCalendars, 'id')

  for ( const remoteCalendarId of toSyncRemoteCalendarIds ) {

    const offlineCal = await GoogleCalendar.getByRemoteCalendarId(googleCredentialId, remoteCalendarId)

    if (offlineCal) {
      createdCalendarIds.push(offlineCal.id)
    }

    if (!offlineCal) {
      const id = await GoogleCalendar.persistRemoteCalendar(googleCredentialId, remoteCalendarsById[remoteCalendarId][0])
      createdCalendarIds.push(id)
    }
  }

  return createdCalendarIds
}

GoogleCalendar.create = async (googleCredentialId, body) => {
  const google   = await getClient(googleCredentialId)
  const calendar = await google.createCalendar(body)

  return await GoogleCalendar.createLocal(googleCredentialId, calendar)
}

GoogleCalendar.getRemoteGoogleCalendars = async (googleCredential) => {
  const sameOwnerRemoteCalendarIds = await db.select('google/calendar/get_same_owner_google_calendars', [googleCredential.email, googleCredential.brand])
  const remoteCalendars            = await GoogleCalendar.listRemoteCalendars(googleCredential.id)
  const currentSyncedCalendars     = await GoogleCalendar.getAllByGoogleCredential(googleCredential.id)

  const currentSyncedRemoteCalendarIds = currentSyncedCalendars.map(record => record.calendar_id)

  let currentRechatRemoteCalendarId = null

  try {
    const currentRechatCalendar = await GoogleCalendar.get(googleCredential.google_calendar)

    if(currentRechatCalendar)
      currentRechatRemoteCalendarId = currentRechatCalendar.calendar_id
  } catch(err) {
    // do nothing
  }

  let currentSelectedCal = null

  const calendars = []

  for ( const remoteCalendar of remoteCalendars ) {

    /*
      Current gmail_address could be connected through other brands
      Every connected_accounts in any specific brand could have a unique rechat_google_calendar
      So we exclude these remote rechat_google_calendars
    */
    if ( !sameOwnerRemoteCalendarIds.includes(remoteCalendar.id) ) {

      const cal = {
        id: remoteCalendar.id,
        name: remoteCalendar.summary || null,
        description: remoteCalendar.description || null,
        permission: (remoteCalendar.accessRole === 'writer' || remoteCalendar.accessRole === 'owner') ? 'read.write' : 'read',
        alreadySynced: currentSyncedRemoteCalendarIds.includes(remoteCalendar.id) ? true : false
      }

      if ( remoteCalendar.id === currentRechatRemoteCalendarId )
        currentSelectedCal = remoteCalendar
      else
        calendars.push(cal)
    }
  }

  return { calendars, currentSelectedCal }
}

GoogleCalendar.configureCalendars = async (credential, conf) => {
  if ( !credential.google_calendar ) {
    await createRechatRemoteCal(credential)

  } else {

    const google = await getClient(credential.id)

    const offlineCal = await GoogleCalendar.get(credential.google_calendar)
    const remoteCal  = await google.getCalendar(offlineCal.calendar_id)

    if (!remoteCal) {
      await handleRemoteDeletedCalendar(offlineCal)
      await createRechatRemoteCal(credential)
    }    
  }

  if (conf.toStopSync) {
    for (const remoteId of conf.toStopSync) {
      const cal = await GoogleCalendar.getByRemoteCalendarId(credential.id, remoteId)

      if (!cal)
        throw Error.ResourceNotFound(`Google calendar by id ${remoteId} not found.`)

      await GoogleCalendar.stopWatchCalendar(cal)
    }
  }

  if (conf.toSync) {
    const ids       = await GoogleCalendar.persistRemoteCalendars(credential.id, conf.toSync)
    const calendars = await GoogleCalendar.getAll(ids)

    for (const cal of calendars) {
      await GoogleCalendar.watchCalendar(cal)
    }
  }

  try {
    await GoogleCredential.forceSync(credential.id)
  } catch (ex) {
    // do nothing
  }
  
  return
}

GoogleCalendar.watch = async (calendar) => {
  const google = await getClient(calendar.google_credential)

  const options = {
    calendarId: calendar.calendar_id,
    requestBody: {
      id: uuid.v4(), // x-goog-channel-id or result.id or watcher_channel_id
      token: calendar.id, // x-goog-channel-token
      type: 'web_hook',
      address: `https://${process.env.API_HOSTNAME}/webhook/google/calendars`,
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
  return await google.watchCalendar(options)
}

GoogleCalendar.stop = async (calendar) => {
  const google = await getClient(calendar.google_credential)

  const options = {
    requestBody: {
      id: calendar.watcher.id, // x-goog-channel-id
      resourceId: calendar.watcher.resourceId // x-goog-resource-id
    }
  }

  return await google.stopWatchCalendar(options)
}

GoogleCalendar.watchCalendar = async (calendar) => {
  if ( calendar.watcher_status === 'active' ) {
    return
  }

  const result = await GoogleCalendar.watch(calendar)
  Context.log('SyncGoogle - watch', calendar.google_credential, result)

  return await GoogleCalendar.updateWatcher(calendar.id, result.id, 'active', result)
}

GoogleCalendar.stopWatchCalendar = async (calendar) => {
  if ( calendar.watcher_status === 'stopped' ) {
    return
  }

  await GoogleCalendar.stop(calendar)

  return await GoogleCalendar.updateWatcher(calendar.id, calendar.watcher.id, 'stopped')
}


Orm.register('google_calendar', 'GoogleCalendar', GoogleCalendar)

module.exports = GoogleCalendar