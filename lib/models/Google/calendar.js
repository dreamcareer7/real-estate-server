const uuid = require('node-uuid')
const _    = require('lodash')

const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const Brand = require('../../models/Brand')
const User  = require('../../models/User')

const GoogleCredential    = require('./credential')
const GoogleCalendarEvent = require('./calendar_events')
const CalendarIntegration = require('../CalendarIntegration')
const getClient = require('./client')

const GoogleCalendar = {}



const resetPrimaryCalendar = async (credential) => {
  const cal = await GoogleCalendar.get(credential.google_calendar)

  const geventIds = await GoogleCalendarEvent.getByCalendarIds(credential.id, [cal.id])
  const records   = await CalendarIntegration.getByGoogleIds(geventIds)

  await GoogleCalendarEvent.deleteLocalByCalendar(cal)
  await GoogleCalendar.deleteLocalByRemoteCalendarId(cal)

  const recordIds = records.map(r => r.id)
  await CalendarIntegration.deleteMany(recordIds)

  await GoogleCredential.resetRechatGoogleCalendar(credential.id)
}

const createRechatRemoteCal = async (credential) => {
  const brand = await Brand.get(credential.brand)
  const user  = await User.get(credential.user)

  const body = {
    summary: `Rechat (${brand.name})`,
    description: `Rechat Google Calendar.\nTeam: ${brand.name}`,
    time_zone: user.timezone
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
  const google = await getClient(googleCredentialId, 'calendar')
  const result = await google.listCalendars()

  const calendars = []

  for ( const cal of result.items ) {
    if( (cal.summary.toLowerCase() !== 'contacts') && (cal.accessRole === 'writer' || cal.accessRole === 'owner') ) {
      calendars.push(cal)
    }
  }

  return calendars
}

GoogleCalendar.persistRemoteCalendars = async (credential, toSyncRemoteCalendarIds = []) => {
  const activeCalendarIds = []
  const deletedCalendars  = []

  const remoteCalendars     = await GoogleCalendar.listRemoteCalendars(credential.id)
  const remoteCalendarsById = _.keyBy(remoteCalendars, 'id')

  for ( const remoteCalendarId of toSyncRemoteCalendarIds ) {
    const remoteCal = remoteCalendarsById[remoteCalendarId]

    const offlineCal = await GoogleCalendar.getByRemoteCalendarId(credential.id, remoteCalendarId)

    if (!remoteCal) {

      if (offlineCal) {
        if ( credential.google_calendar === offlineCal.id ) {
          await resetPrimaryCalendar(credential)
        }

        deletedCalendars.push(offlineCal)
      }

    } else {
  
      if (offlineCal) {
        activeCalendarIds.push(offlineCal.id)
      }
  
      if (!offlineCal) {
        const id = await GoogleCalendar.persistRemoteCalendar(credential.id, remoteCal)
        activeCalendarIds.push(id)
      }
    }
  }

  return {
    activeCalendarIds,
    deletedCalendars
  }
}

GoogleCalendar.create = async (googleCredentialId, body) => {
  const google   = await getClient(googleCredentialId, 'calendar')
  const calendar = await google.createCalendar(body)

  return await GoogleCalendar.createLocal(googleCredentialId, calendar)
}

GoogleCalendar.getRemoteGoogleCalendars = async (googleCredential) => {
  const sameOwnerRemoteCalendarIds = await db.select('google/calendar/get_same_owner_google_calendars', [googleCredential.email, googleCredential.brand])
  const remoteCalendars            = await GoogleCalendar.listRemoteCalendars(googleCredential.id)
  const currentSyncedCalendars     = await GoogleCalendar.getAllByGoogleCredential(googleCredential.id)

  const currentSyncedRemoteCalendarIds = currentSyncedCalendars.filter(cal => cal.watcher_status === 'active' ).map(cal => cal.calendar_id)

  let isConfigured = false
  let currentRechatCalRemoteId = null
  let primaryCalendar = null

  try {
    const currentRechatCalendar = await GoogleCalendar.get(googleCredential.google_calendar)

    if(currentRechatCalendar) {
      currentRechatCalRemoteId = currentRechatCalendar.calendar_id
    }

  } catch(err) {
    // do nothing
  }

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
        timeZone: remoteCalendar.timeZone,
        permission: (remoteCalendar.accessRole === 'writer' || remoteCalendar.accessRole === 'owner') ? 'read.write' : 'read',
        alreadySynced: currentSyncedRemoteCalendarIds.includes(remoteCalendar.id) ? true : false
      }

      if ( remoteCalendar.id === currentRechatCalRemoteId ) {
        primaryCalendar = cal
      } else {
        calendars.push(cal)
      }
    }
  }

  if ( googleCredential.google_calendar) {
    if ( primaryCalendar && primaryCalendar.alreadySynced ) {
      isConfigured = true
    }
  }

  return { calendars, primaryCalendar, isConfigured }
}

GoogleCalendar.configureCalendars = async (credential, conf) => {
  if ( !credential.google_calendar ) {
    await createRechatRemoteCal(credential)

  } else {

    const google = await getClient(credential.id, 'calendar')

    const offlineCal = await GoogleCalendar.get(credential.google_calendar)
    const remoteCal  = await google.getCalendar(offlineCal.calendar_id)

    if (!remoteCal) {
      await resetPrimaryCalendar(credential)
      await createRechatRemoteCal(credential)
      // throw Error.ResourceNotFound('Rechat primary calendar is deleted! Please try again.')
    } else {
      await GoogleCalendar.watchCalendar(offlineCal)
    }
  }

  if (conf.toStopSync) {
    const promises = []

    for (const remoteId of conf.toStopSync) {
      const cal = await GoogleCalendar.getByRemoteCalendarId(credential.id, remoteId)

      if (cal) {
        promises.push(GoogleCalendar.stopWatchCalendar(cal))
      } else {
        // throw Error.ResourceNotFound(`Google calendar by id ${remoteId} is not synced.`)
      }
    }

    await Promise.all(promises)
  }

  if (conf.toSync) {
    const result    = await GoogleCalendar.persistRemoteCalendars(credential, conf.toSync)
    const calendars = await GoogleCalendar.getAll(result.activeCalendarIds)

    const promises = []

    for (const cal of calendars) {
      promises.push(GoogleCalendar.watchCalendar(cal))
    }

    await Promise.all(promises)
  }

  try {
    // ???
    await GoogleCredential.forceSync(credential.id)
  } catch (ex) {
    // do nothing
  }

  return
}

GoogleCalendar.watch = async (calendar) => {
  const google = await getClient(calendar.google_credential, 'calendar')

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

  try {
    return await google.watchCalendar(options)

  } catch (ex) {

    if ( ex.message === 'Push notifications are not supported by this resource.' && ex.code === 400 ) {
      throw Error.Validation(`Push notifications are not supported by calendar: ${calendar.summary || calendar.id}.`)
    }

    throw ex
  }
}

GoogleCalendar.stop = async (calendar) => {
  const google = await getClient(calendar.google_credential, 'calendar')

  const options = {
    requestBody: {
      id: calendar.watcher.id, // x-goog-channel-id
      resourceId: calendar.watcher.resourceId // x-goog-resource-id
    }
  }

  return await google.stopWatchCalendar(options)
}

GoogleCalendar.watchCalendar = async (calendar) => {
  const result = await GoogleCalendar.watch(calendar)

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