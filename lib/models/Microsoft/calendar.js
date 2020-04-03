const _    = require('lodash')

const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const Brand = require('../../models/Brand')
const User  = require('../../models/User')

const MicrosoftCredential    = require('./credential')
const MicrosoftCalendarEvent = require('./calendar_events')
const CalendarIntegration    = require('../CalendarIntegration')
const getClient = require('./client')

const { createNewSubscriptions, updateSubscriptions } = require('./workers/subscriptions/common')

const MicrosoftCalendar = {}



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
  await MicrosoftCalendar.updateToSync([offlineCal.id], true)

  return
}


MicrosoftCalendar.createLocal = async function (microsoftCredentialId, calendar) {
  return db.insert('microsoft/calendar/insert',[
    microsoftCredentialId,
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
 * @param {UUID} microsoftCredentialId
 */
MicrosoftCalendar.getAllByMicrosoftCredential = async (microsoftCredentialId) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_credential', [microsoftCredentialId])

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
 * @param {UUID} microsoftCredentialId
 * @param {String[]} remoteCalendarIds
 */
MicrosoftCalendar.getByRemoteCalendarIds = async (microsoftCredentialId, remoteCalendarIds) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_remote_cal', [microsoftCredentialId, remoteCalendarIds])

  if ( ids.length === 0 )
    return []

  return await MicrosoftCalendar.getAll(ids)
}

/**
 * @param {UUID} microsoftCredentialId
 * @param {String} remoteCalendarId 
 */
MicrosoftCalendar.getByRemoteCalendarId = async (microsoftCredentialId, remoteCalendarId) => {
  const result = await MicrosoftCalendar.getByRemoteCalendarIds(microsoftCredentialId, [remoteCalendarId])

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


MicrosoftCalendar.listRemoteCalendars = async function (microsoftCredentialId) {
  const microsoft = await getClient(microsoftCredentialId, 'calendar')
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

MicrosoftCalendar.create = async (microsoftCredentialId, body) => {
  const microsoft = await getClient(microsoftCredentialId, 'calendar')
  const calendar  = await microsoft.createCalendar(body)

  return await MicrosoftCalendar.createLocal(microsoftCredentialId, calendar)
}

MicrosoftCalendar.getRemoteMicrosoftCalendars = async (microsoftCredential) => {
  const sameOwnerRemoteCalendarIds = await db.select('microsoft/calendar/get_same_owner_microsoft_calendars', [microsoftCredential.email, microsoftCredential.brand])
  const remoteCalendars            = await MicrosoftCalendar.listRemoteCalendars(microsoftCredential.id)
  const currentSyncedCalendars     = await MicrosoftCalendar.getAllByMicrosoftCredential(microsoftCredential.id)

  const currentSyncedRemoteCalendarIds = currentSyncedCalendars.filter(cal => cal.to_sync ).map(cal => cal.calendar_id)

  let isConfigured = false
  let currentRechatCalRemoteId = null
  let primaryCalendar = null

  let currentRechatRemoteCalendarId = null

  try {
    const currentRechatCalendar = await MicrosoftCalendar.get(microsoftCredential.microsoft_calendar)

    if(currentRechatCalendar) {
      currentRechatRemoteCalendarId = currentRechatCalendar.calendar_id
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

  if ( microsoftCredential.microsoft_calendar) {
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

    const microsoft = await getClient(credential.id, 'calendar')

    const offlineCal = await MicrosoftCalendar.get(credential.microsoft_calendar)
    const remoteCal  = await microsoft.getCalendar(offlineCal.calendar_id)

    if (!remoteCal) {
      await resetPrimaryCalendar(credential)
      await createRechatRemoteCal(credential)
      // throw Error.ResourceNotFound('Rechat primary calendar is deleted! Please try again.')
    } else {
      await MicrosoftCalendar.updateToSync([offlineCal.id], true)
    }
  }

  if (conf.toStopSync) {
    const cals = await MicrosoftCalendar.getByRemoteCalendarIds(credential.id, conf.toStopSync)
    const ids  = cals.map(c => c.id)

    await MicrosoftCalendar.updateToSync(ids, false)
  }

  if (conf.toSync) {
    const result    = await MicrosoftCalendar.persistRemoteCalendars(credential, conf.toSync)
    const calendars = await MicrosoftCalendar.getAll(result.activeCalendarIds)

    const ids = calendars.map(cal => cal.id)
    await MicrosoftCalendar.updateToSync(ids, true)
  }

  try {
    await MicrosoftCredential.forceSyncCalendar(credential.id)
  } catch (ex) {
    // do nothing
  }

  await MicrosoftCalendar.subscribe(credential.id)

  return
}

MicrosoftCalendar.subscribe = async (cid) => {
  const microsoft = await getClient(cid, 'calendar')

  return await createNewSubscriptions(microsoft, cid, 'me/events')
}


Orm.register('microsoft_calendar', 'MicrosoftCalendar', MicrosoftCalendar)

module.exports = MicrosoftCalendar