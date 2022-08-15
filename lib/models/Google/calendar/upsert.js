const uuid = require('uuid')
const _    = require('lodash')

const db    = require('../../../utils/db.js')
const Brand = require('../../../models/Brand/get')
const User  = require('../../../models/User/get')
const Context = require('../../Context')

const getClient = require('../client')

const GoogleCalendarEvent = {
  ...require('../calendar_events/get'),
  ...require('../calendar_events/delete')
}

const CalendarIntegration = {
  ...require('../../CalendarIntegration/get'),
  ...require('../../CalendarIntegration/delete')
}

const { resetRechatGoogleCalendar, updateRechatGoogleCalendar } = require('../credential/update')
const { get, getAll, getAllByGoogleCredential, getByRemoteCalendarId } = require ('./get')
const { deleteLocalByRemoteCalendarId } = require('./delete')
const { createLocal, persistRemoteCalendar } = require('./create')
const { updateWatcher } = require('./update')


const resetPrimaryCalendar = async (credential) => {
  const cal = await get(credential.google_calendar)

  const geventIds = await GoogleCalendarEvent.getByCalendarIds(credential.id, [cal.id])
  const records   = await CalendarIntegration.getByGoogleIds(geventIds)

  await GoogleCalendarEvent.deleteLocalByCalendar(cal)
  await deleteLocalByRemoteCalendarId(cal)

  const recordIds = records.map(r => r.id)
  await CalendarIntegration.deleteMany(recordIds)

  await resetRechatGoogleCalendar(credential.id)
}

const createRechatRemoteCal = async (credential) => {
  const brand = await Brand.get(credential.brand)
  const user  = await User.get(credential.user)

  let summary     = `Rechat (${brand.name})`
  let description = `Rechat Google Calendar.\nTeam: ${brand.name}`

  if ( process.env.API_HOSTNAME === 'alpine.api.rechat.com' ) {
    summary = `Rechat (${brand.name} - Alpine)`
    description = `Rechat Google Calendar.\nTeam: ${brand.name}\nStage: Alpine`
  }

  if ( process.env.API_HOSTNAME === 'boer.api.rechat.com' ) {
    summary = `Rechat (${brand.name} - Boer)`
    description = `Rechat Google Calendar.\nTeam: ${brand.name}\nStage: Boer`
  }

  const body = {
    summary,
    description,
    time_zone: user.timezone
  }

  const rechatCalendarId = await create(credential.id, body)
  await updateRechatGoogleCalendar(credential.id, rechatCalendarId)

  const offlineCal = await get(rechatCalendarId)
  await watchCalendar(offlineCal)
}

const handleOldCalendar = async (credential) => {
  const google = await getClient(credential.id, 'calendar')

  const offlineCal = await get(credential.google_calendar)
  const remoteCal  = await google.getCalendar(offlineCal.calendar_id)

  if (!remoteCal) {
    await resetPrimaryCalendar(credential)
    await createRechatRemoteCal(credential)
    // throw Error.ResourceNotFound('Rechat primary calendar is deleted! Please try again.')
  } else {
    await watchCalendar(offlineCal)
  }
}

const handleToStopSync = async (credential, toStopSync) => {
  const promises = []

  for (const remoteId of toStopSync) {
    const cal = await getByRemoteCalendarId(credential.id, remoteId)

    if (cal) {
      promises.push(stopWatchCalendar(cal))
    } else {
      // throw Error.ResourceNotFound(`Google calendar by id ${remoteId} is not synced.`)
    }
  }

  await Promise.all(promises)
}

const handleToSync = async (credential, toSync) => {
  const result    = await persistRemoteCalendars(credential, toSync)
  const calendars = await getAll(result.activeCalendarIds)

  const promises = []

  for (const cal of calendars) {
    promises.push(watchCalendar(cal))
  }

  await Promise.all(promises)
}

const listRemoteCalendars = async function (googleCredentialId) {
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

const persistRemoteCalendars = async (credential, toSyncRemoteCalendarIds = []) => {
  const activeCalendarIds = []
  const deletedCalendars  = []

  const remoteCalendars     = await listRemoteCalendars(credential.id)
  const remoteCalendarsById = _.keyBy(remoteCalendars, 'id')

  for ( const remoteCalendarId of toSyncRemoteCalendarIds ) {
    const remoteCal = remoteCalendarsById[remoteCalendarId]

    const offlineCal = await getByRemoteCalendarId(credential.id, remoteCalendarId)

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
        const id = await persistRemoteCalendar(credential.id, remoteCal)
        activeCalendarIds.push(id)
      }
    }
  }

  return {
    activeCalendarIds,
    deletedCalendars
  }
}

const create = async (googleCredentialId, body) => {
  const google   = await getClient(googleCredentialId, 'calendar')
  const calendar = await google.createCalendar(body)

  return await createLocal(googleCredentialId, calendar)
}

const getRemoteGoogleCalendars = async (googleCredential) => {
  const sameOwnerRemoteCalendarIds = await db.select('google/calendar/get_same_owner_google_calendars', [googleCredential.email, googleCredential.brand])
  const remoteCalendars            = await listRemoteCalendars(googleCredential.id)
  const currentSyncedCalendars     = await getAllByGoogleCredential(googleCredential.id)

  const currentSyncedRemoteCalendarIds = currentSyncedCalendars.filter(cal => cal.watcher_status === 'active' ).map(cal => cal.calendar_id)

  let isConfigured = false
  let currentRechatCalRemoteId = null
  let primaryCalendar = null

  try {
    const currentRechatCalendar = await get(googleCredential.google_calendar)

    if(currentRechatCalendar) {
      currentRechatCalRemoteId = currentRechatCalendar.calendar_id
    }

  } catch(err) {
    // do nothing
    Context.log('Google getRemoteGoogleCalendars-Failed', err)
  }

  const calendars = []

  for ( const remoteCalendar of remoteCalendars ) {

    /*
      Current gmail_address could be connected through other brands
      Every connected_account in any specific brand could have a unique rechat_google_calendar
      So we need to exclude these remote rechat_google_calendars
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

const configureCalendars = async (credential, conf) => {
  if ( !credential.google_calendar ) {
    await createRechatRemoteCal(credential)
  } else {
    await handleOldCalendar(credential)
  }

  if (conf.toStopSync) {
    await handleToStopSync(credential, conf.toStopSync)
  }

  if (conf.toSync) {
    await handleToSync(credential, conf.toSync)
  }
}


const watch = async (calendar) => {
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
    There is no automatic way to renew a notification channel. When a channel is close to its expiration,
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

const stop = async (calendar) => {
  const google = await getClient(calendar.google_credential, 'calendar')

  const options = {
    requestBody: {
      id: calendar.watcher.id, // x-goog-channel-id
      resourceId: calendar.watcher.resourceId // x-goog-resource-id
    }
  }

  return await google.stopWatchCalendar(options)
}

const watchCalendar = async (calendar) => {
  const result = await watch(calendar)

  return await updateWatcher(calendar.id, result.id, 'active', result)
}

const stopWatchCalendar = async (calendar) => {
  if ( calendar.watcher_status === 'stopped' ) {
    return
  }

  await stop(calendar)

  return await updateWatcher(calendar.id, calendar.watcher.id, 'stopped')
}


module.exports = {
  listRemoteCalendars,
  persistRemoteCalendars,
  create,
  getRemoteGoogleCalendars,
  configureCalendars,
  watch,
  stop,
  watchCalendar,
  stopWatchCalendar
}