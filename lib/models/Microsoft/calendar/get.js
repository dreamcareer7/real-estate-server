const _ = require('lodash')

const db        = require('../../../utils/db.js')
const Brand     = require('../../../models/Brand')
const Context   = require('../../Context')
const UsersJob  = require('../../UsersJob')

const MicrosoftCredential    = require('../credential')
const MicrosoftCalendarEvent = require('../calendar_events')
const CalendarIntegration    = require('../../CalendarIntegration')
const getClient = require('../client')

const { subscribe, unsubscribe } = require('../workers/subscriptions/common')


const subscribeCal = async (calendar) => {
  const microsoft = await getClient(calendar.microsoft_credential, 'calendar')
  
  const resource = `me/calendars/${calendar.calendar_id}/events`

  await updateToSync([calendar.id], true)
  await subscribe(microsoft, calendar.microsoft_credential, resource)

  return
}

const unsubscribeCal = async (calendar) => {
  const microsoft = await getClient(calendar.microsoft_credential, 'calendar')

  const resource = `me/calendars/${calendar.calendar_id}/events`

  await updateToSync([calendar.id], false)
  await unsubscribe(microsoft, calendar.microsoft_credential, resource)

  return
}

const resetPrimaryCalendar = async (credential) => {
  const cal = await get(credential.microsoft_calendar)

  const meventIds = await MicrosoftCalendarEvent.getByCalendarIds(credential.id, [cal.id])
  const records   = await CalendarIntegration.getByGoogleIds(meventIds)

  await MicrosoftCalendarEvent.deleteLocalByCalendar(cal)
  await deleteLocalByRemoteCalendarId(cal)

  const recordIds = records.map(r => r.id)
  await CalendarIntegration.deleteMany(recordIds)

  await MicrosoftCredential.resetRechatMicrosoftCalendar(credential.id)
}

const createRechatRemoteCal = async (credential) => {
  const brand = await Brand.get(credential.brand)
  // const user = await User.get(credential.user)

  let name = `Rechat (${brand.name})`

  if ( process.env.API_HOSTNAME === 'alpine.api.rechat.com' ) {
    name = `Rechat (${brand.name} - Alpine)`
  }

  if ( process.env.API_HOSTNAME === 'boer.api.rechat.com' ) {
    name = `Rechat (${brand.name} - Boer)`
  }

  const body = {
    name,
    // description: `Rechat Google Calendar.\nTeam: ${brand.name}`,
    // time_zone: user.timezone
  }

  const rechatCalendarId = await create(credential.id, body)
  await MicrosoftCredential.updateRechatMicrosoftCalendar(credential.id, rechatCalendarId)
  const offlineCal = await get(rechatCalendarId)
  await subscribeCal(offlineCal)

  return
}

const handleOldCalendar = async (credential) => {
  const microsoft = await getClient(credential.id, 'calendar')

  const offlineCal = await get(credential.microsoft_calendar)
  const remoteCal  = await microsoft.getCalendar(offlineCal.calendar_id)

  if (!remoteCal) {
    await resetPrimaryCalendar(credential)
    await createRechatRemoteCal(credential)
    // throw Error.ResourceNotFound('Rechat primary calendar is deleted! Please try again.')
  } else {
    await subscribeCal(offlineCal)
  }
}

const handleToStopSync = async (credential, toStopSync) => {
  const promises = []

  for (const remoteId of toStopSync) {
    const cal = await getByRemoteCalendarId(credential.id, remoteId)

    if (cal) {
      promises.push(unsubscribeCal(cal))
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
    promises.push(subscribeCal(cal))
  }

  await Promise.all(promises)
}


const createLocal = async function (credentialId, calendar) {
  return db.insert('microsoft/calendar/insert',[
    credentialId,
    calendar.id,
    calendar.name || null,
    calendar.color || null,
    calendar.changeKey || null,
    calendar.canShare || null,
    calendar.canViewPrivateItems || null,
    calendar.canEdit || null,
    JSON.stringify(calendar.owner || {}),
    calendar.origin || 'rechat'
  ])
}

/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('microsoft/calendar/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const calendars = await getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Microsoft calendar by id ${id} not found.`)

  return calendars[0]
}

/**
 * @param {UUID} credentialId
 */
const getAllByMicrosoftCredential = async (credentialId) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_credential', [credentialId])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}

/**
 * @param {UUID} credentialId
 * @param {String[]} remoteCalendarIds
 */
const getByRemoteCalendarIds = async (credentialId, remoteCalendarIds) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_remote_cal', [credentialId, remoteCalendarIds])

  if ( ids.length === 0 )
    return []

  return await getAll(ids)
}

/**
 * @param {UUID} credentialId
 * @param {String} remoteCalendarId 
 */
const getByRemoteCalendarId = async (credentialId, remoteCalendarId) => {
  const result = await getByRemoteCalendarIds(credentialId, [remoteCalendarId])

  if ( result.length === 0 )
    return null

  return result[0]
}

/**
 * @param {Object} calendar 
 */
const deleteLocalByRemoteCalendarId = async function (calendar) {
  await db.select('microsoft/calendar/delete_by_remote_cal_id', [calendar.microsoft_credential, calendar.calendar_id])
}

/**
 * @param {UUID[]} ids
 * @param {Boolean} flag
 */
const updateToSync = async (ids, flag) => {
  return await db.select('microsoft/calendar/update_to_sync', [ids, flag])
}

/**
 * @param {UUID} id
 * @param {String} syncToken 
 */
const updateDeltaToken = async (id, syncToken) => {
  return await db.selectId('microsoft/calendar/update_delta_token', [id, syncToken])
}


const listRemoteCalendars = async function (credentialId) {
  const microsoft = await getClient(credentialId, 'calendar')
  const result    = await microsoft.listCalendars()

  const calendars = []

  for ( const cal of result.value ) {
    // if( (cal.summary.toLowerCase() !== 'contacts') && (cal.accessRole === 'writer' || cal.accessRole === 'owner') )
    if( cal.name.toLowerCase() !== 'birthdays' ) {
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
        if ( credential.microsoft_calendar === offlineCal.id ) {
          await resetPrimaryCalendar(credential)
        }

        deletedCalendars.push(offlineCal)
      }

    } else {

      if (offlineCal) {
        activeCalendarIds.push(offlineCal.id)
      }
    
      if (!offlineCal) {
        const id = await createLocal(credential.id, {...remoteCal, origin: 'microsoft'})
        activeCalendarIds.push(id)
      }
    }
  }

  return {
    activeCalendarIds,
    deletedCalendars
  }
}

const create = async (credentialId, body) => {  
  try {
    const microsoft = await getClient(credentialId, 'calendar')
    const calendar  = await microsoft.createCalendar(body)

    return await createLocal(credentialId, calendar)

  } catch (ex) {

    if ( ex.message === 'A folder with the specified name already exists.' ) {
      Context.log('MicrosoftCalendarCreate failed', ex.message)
    }

    throw ex
  }
}

const getRemoteMicrosoftCalendars = async (credential) => {
  const sameOwnerRemoteCalendarIds = await db.select('microsoft/calendar/get_same_owner_microsoft_calendars', [credential.email, credential.brand])
  const remoteCalendars            = await listRemoteCalendars(credential.id)
  const currentSyncedCalendars     = await getAllByMicrosoftCredential(credential.id)

  const currentSyncedRemoteCalendarIds = currentSyncedCalendars.filter(cal => cal.to_sync ).map(cal => cal.calendar_id)

  let isConfigured = false
  let currentRechatCalRemoteId = null
  let primaryCalendar = null

  try {
    const currentRechatCalendar = await get(credential.microsoft_calendar)

    if(currentRechatCalendar) {
      currentRechatCalRemoteId = currentRechatCalendar.calendar_id
    }

  } catch(err) {
    // do nothing
  }

  const calendars = []

  for ( const remoteCalendar of remoteCalendars ) {

    /*
      Current outlook_address could be connected through other brands
      Every connected_accounts in any specific brand could have a unique rechat_microsoft_calendar
      So we exclude these remote rechat_microsoft_calendars
    */
    if ( !sameOwnerRemoteCalendarIds.includes(remoteCalendar.id) ) {

      if (!remoteCalendar.canEdit) {
        continue
      }

      const cal = {
        id: remoteCalendar.id,
        name: remoteCalendar.name || null,
        description: remoteCalendar.description || null,
        permission: remoteCalendar.canEdit ? 'read.write' : 'read',
        alreadySynced: currentSyncedRemoteCalendarIds.includes(remoteCalendar.id) ? true : false
      }

      if ( remoteCalendar.id === currentRechatCalRemoteId ) {
        primaryCalendar = cal
      } else {
        calendars.push(cal)
      }
    }
  }

  if ( credential.microsoft_calendar) {
    if ( primaryCalendar && primaryCalendar.alreadySynced ) {
      isConfigured = true
    }
  }

  return { calendars, primaryCalendar, isConfigured }
}

const configureCalendars = async (credential, conf) => {
  if ( !credential.microsoft_calendar ) {
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

  try {
    await UsersJob.forceSyncByMicrosoftCredential(credential.id, 'calendar')
  } catch (ex) {
    // do nothing
  }

  return
}


module.exports = {
  createLocal,
  getAll,
  get,
  getAllByMicrosoftCredential,
  getByRemoteCalendarIds,
  getByRemoteCalendarId,
  deleteLocalByRemoteCalendarId,
  updateToSync,
  updateDeltaToken,
  listRemoteCalendars,
  persistRemoteCalendars,
  create,
  getRemoteMicrosoftCalendars,
  configureCalendars
}