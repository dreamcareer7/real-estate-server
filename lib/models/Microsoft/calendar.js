const _ = require('lodash')

const Orm     = require('../Orm')
const db      = require('../../utils/db.js')
const Brand   = require('../../models/Brand')
// const User = require('../../models/User')
const Context = require('../Context')

const MicrosoftCredential    = require('./credential')
const MicrosoftCalendarEvent = require('./calendar_events')
const CalendarIntegration    = require('../CalendarIntegration')
const getClient = require('./client')

const { subscribe, unsubscribe } = require('./workers/subscriptions/common')

const MicrosoftCalendar = {}


const subscribeCal = async (calendar) => {
  const microsoft = await getClient(calendar.microsoft_credential, 'calendar')
  
  const resource = `me/calendars/${calendar.calendar_id}/events`

  await MicrosoftCalendar.updateToSync([calendar.id], true)
  await subscribe(microsoft, calendar.microsoft_credential, resource)

  return
}

const unsubscribeCal = async (calendar) => {
  const microsoft = await getClient(calendar.microsoft_credential, 'calendar')

  const resource = `me/calendars/${calendar.calendar_id}/events`

  await MicrosoftCalendar.updateToSync([calendar.id], false)
  await unsubscribe(microsoft, calendar.microsoft_credential, resource)

  return
}

const resetPrimaryCalendar = async (credential) => {
  const cal = await MicrosoftCalendar.get(credential.microsoft_calendar)

  const meventIds = await MicrosoftCalendarEvent.getByCalendarIds(credential.id, [cal.id])
  const records   = await CalendarIntegration.getByGoogleIds(meventIds)

  await MicrosoftCalendarEvent.deleteLocalByCalendar(cal)
  await MicrosoftCalendar.deleteLocalByRemoteCalendarId(cal)

  const recordIds = records.map(r => r.id)
  await CalendarIntegration.deleteMany(recordIds)

  await MicrosoftCredential.resetRechatMicrosoftCalendar(credential.id)
}

const createRechatRemoteCal = async (credential) => {
  const brand = await Brand.get(credential.brand)
  // const user = await User.get(credential.user)

  const body = {
    name: `Rechat (${brand.name})`
    // description: `Rechat Google Calendar.\nTeam: ${brand.name}`,
    // time_zone: user.timezone
  }

  const rechatCalendarId = await MicrosoftCalendar.create(credential.id, body)
  await MicrosoftCredential.updateRechatMicrosoftCalendar(credential.id, rechatCalendarId)
  const offlineCal = await MicrosoftCalendar.get(rechatCalendarId)
  await subscribeCal(offlineCal)

  return
}

const handleOldCalendar = async (credential) => {
  const microsoft = await getClient(credential.id, 'calendar')

  const offlineCal = await MicrosoftCalendar.get(credential.microsoft_calendar)
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
    const cal = await MicrosoftCalendar.getByRemoteCalendarId(credential.id, remoteId)

    if (cal) {
      promises.push(unsubscribeCal(cal))
    } else {
      // throw Error.ResourceNotFound(`Google calendar by id ${remoteId} is not synced.`)
    }
  }

  await Promise.all(promises)
}

const handleToSync = async (credential, toSync) => {
  const result    = await MicrosoftCalendar.persistRemoteCalendars(credential, toSync)
  const calendars = await MicrosoftCalendar.getAll(result.activeCalendarIds)

  const promises = []

  for (const cal of calendars) {
    promises.push(subscribeCal(cal))
  }

  await Promise.all(promises)
}



MicrosoftCalendar.createLocal = async function (credentialId, calendar) {
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
MicrosoftCalendar.getAll = async (ids) => {
  return await db.select('microsoft/calendar/get', [ids])
}

/**
 * @param {UUID} id
 */
MicrosoftCalendar.get = async (id) => {
  const calendars = await MicrosoftCalendar.getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Microsoft calendar by id ${id} not found.`)

  return calendars[0]
}

/**
 * @param {UUID} credentialId
 */
MicrosoftCalendar.getAllByMicrosoftCredential = async (credentialId) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_credential', [credentialId])

  if (ids.length < 1)
    return []

  return await MicrosoftCalendar.getAll(ids)
}

/**
 * @param {UUID} id
 * @param {String} syncToken 
 */
MicrosoftCalendar.updateDeltaToken = async (id, syncToken) => {
  return await db.selectId('microsoft/calendar/update_delta_token', [id, syncToken])
}

/**
 * @param {UUID} credentialId
 * @param {String[]} remoteCalendarIds
 */
MicrosoftCalendar.getByRemoteCalendarIds = async (credentialId, remoteCalendarIds) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_remote_cal', [credentialId, remoteCalendarIds])

  if ( ids.length === 0 )
    return []

  return await MicrosoftCalendar.getAll(ids)
}

/**
 * @param {UUID} credentialId
 * @param {String} remoteCalendarId 
 */
MicrosoftCalendar.getByRemoteCalendarId = async (credentialId, remoteCalendarId) => {
  const result = await MicrosoftCalendar.getByRemoteCalendarIds(credentialId, [remoteCalendarId])

  if ( result.length === 0 )
    return null

  return result[0]
}

/**
 * @param {Object} calendar 
 */
MicrosoftCalendar.deleteLocalByRemoteCalendarId = async function (calendar) {
  await db.select('microsoft/calendar/delete_by_remote_cal_id', [calendar.microsoft_credential, calendar.calendar_id])
}

/**
 * @param {UUID[]} ids
 * @param {Boolean} flag
 */
MicrosoftCalendar.updateToSync = async (ids, flag) => {
  return await db.select('microsoft/calendar/update_to_sync', [ids, flag])
}

MicrosoftCalendar.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
}


MicrosoftCalendar.listRemoteCalendars = async function (credentialId) {
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

MicrosoftCalendar.persistRemoteCalendars = async (credential, toSyncRemoteCalendarIds = []) => {
  const activeCalendarIds = []
  const deletedCalendars  = []

  const remoteCalendars     = await MicrosoftCalendar.listRemoteCalendars(credential.id)
  const remoteCalendarsById = _.keyBy(remoteCalendars, 'id')

  for ( const remoteCalendarId of toSyncRemoteCalendarIds ) {
    const remoteCal = remoteCalendarsById[remoteCalendarId]

    const offlineCal = await MicrosoftCalendar.getByRemoteCalendarId(credential.id, remoteCalendarId)

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
        const id = await MicrosoftCalendar.createLocal(credential.id, {...remoteCal, origin: 'microsoft'})
        activeCalendarIds.push(id)
      }
    }
  }

  return {
    activeCalendarIds,
    deletedCalendars
  }
}

MicrosoftCalendar.create = async (credentialId, body) => {  
  try {
    const microsoft = await getClient(credentialId, 'calendar')
    const calendar  = await microsoft.createCalendar(body)

    return await MicrosoftCalendar.createLocal(credentialId, calendar)

  } catch (ex) {

    if ( ex.message === 'A folder with the specified name already exists.' ) {
      Context.log('MicrosoftCalendar.create failed', ex.message)
    }

    throw ex
  }
}

MicrosoftCalendar.getRemoteMicrosoftCalendars = async (credential) => {
  const sameOwnerRemoteCalendarIds = await db.select('microsoft/calendar/get_same_owner_microsoft_calendars', [credential.email, credential.brand])
  const remoteCalendars            = await MicrosoftCalendar.listRemoteCalendars(credential.id)
  const currentSyncedCalendars     = await MicrosoftCalendar.getAllByMicrosoftCredential(credential.id)

  const currentSyncedRemoteCalendarIds = currentSyncedCalendars.filter(cal => cal.to_sync ).map(cal => cal.calendar_id)

  let isConfigured = false
  let currentRechatCalRemoteId = null
  let primaryCalendar = null

  try {
    const currentRechatCalendar = await MicrosoftCalendar.get(credential.microsoft_calendar)

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

MicrosoftCalendar.configureCalendars = async (credential, conf) => {
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
    await MicrosoftCredential.forceSyncCalendar(credential.id)
  } catch (ex) {
    // do nothing
  }

  return
}



Orm.register('microsoft_calendar', 'MicrosoftCalendar', MicrosoftCalendar)

module.exports = MicrosoftCalendar