const _ = require('lodash')

const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')

const MicrosoftCredential    = require('./credential')
const MicrosoftCalendarEvent = require('./calendar_events')
const { getMockClient, getMGraphClient } = require('./plugin/client.js')


const MicrosoftCalendar = {}

const SCOPE_OUTLOOK_CAL = config.microsoft_scopes.calendar[0]


/**
 * @param {UUID} cid microsoft_credential_id
 */
const getClient = async (cid) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  const credential = await MicrosoftCredential.get(cid)

  if (credential.revoked)
    throw Error.BadRequest('Microsoft-Credential is revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Microsoft-Credential is deleted!')

  if (!credential.scope.includes(SCOPE_OUTLOOK_CAL))
    throw Error.BadRequest('Access is denied! Insufficient permission.')

  const microsoft  = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  return microsoft
}

// ???
const handleRemoteDeletedCalendar = async (cal) => {
  await MicrosoftCalendar.deleteLocalByRemoteCalendarId(cal)
  await MicrosoftCalendarEvent.deleteLocalByCalendar(cal)
  // await MicrosoftCalendar.stopWatchCalendar(cal)
}

// ???
const createRechatRemoteCal = async (credential) => {
  const body = {
    name: 'Rechat'
  }

  const rechatCalendarId = await MicrosoftCalendar.create(credential.id, body)
  await MicrosoftCredential.updateRechatMicrosoftCalendar(credential.id, rechatCalendarId)

  // const offlineCal = await MicrosoftCalendar.get(rechatCalendarId)
  // await MicrosoftCalendar.watchCalendar(offlineCal)

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
    JSON.stringify(calendar.owner),
    calendar.origin || 'rechat'
  ])
}

MicrosoftCalendar.updateLocal = async function (id, updatedCalendar) {
  return await db.selectIds('microsoft/calendar/update', [
    id,
    updatedCalendar.summary || null,
    updatedCalendar.description || null,
    updatedCalendar.location || null,
    updatedCalendar.timeZone || null,
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
 * @param {String} channelId
 */
MicrosoftCalendar.getByWatcherChannelId = async (channelId) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_channel_id', [channelId])

  if (ids.length < 1)
    return null

  return await MicrosoftCalendar.get(ids[0])
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
MicrosoftCalendar.updateSyncToken = async (id, syncToken) => {
  return await db.selectId('microsoft/calendar/update_sync_token', [id, syncToken])
}

/**
 * @param {UUID} microsoftCredentialId
 * @param {String} remoteCalendarId 
 */
MicrosoftCalendar.getByRemoteCalendarId = async (microsoftCredentialId, remoteCalendarId) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_remote_cal', [microsoftCredentialId, remoteCalendarId])

  if ( ids.length === 0 )
    return null

  return await MicrosoftCalendar.get(ids[0])
}

/**
 * @param {Object} calendar 
 */
MicrosoftCalendar.deleteLocalByRemoteCalendarId = async function (calendar) {
  await db.select('microsoft/calendar/delete_by_remote_cal_id', [calendar.microsoft_credential, calendar.calendar_id])
}

/**
 * @param {UUID} id
 * @param {UUID} channelId
 * @param {String} status
 * @param {Object} result
 */
MicrosoftCalendar.updateWatcher = async (id, channelId, status, result = {}) => {
  return await db.select('microsoft/calendar/update_watcher', [id, status, channelId, JSON.stringify(result)])
}

MicrosoftCalendar.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
}


MicrosoftCalendar.listRemoteCalendars = async function (microsoftCredentialId) {
  const microsoft = await getClient(microsoftCredentialId)
  const result    = await microsoft.listCalendars()

  const calendars = []

  for ( const cal of result.value ) {
    if( cal.name.toLowerCase() !== 'birthdays' )
      calendars.push(cal)
  }

  return calendars
}

MicrosoftCalendar.persistRemoteCalendars = async (microsoftCredentialId, toSyncRemoteCalendarIds = []) => {
  const createdCalendarIds = []

  const remoteCalendars     = await MicrosoftCalendar.listRemoteCalendars(microsoftCredentialId)
  const remoteCalendarsById = _.groupBy(remoteCalendars, 'id')

  for ( const remoteCalendarId of toSyncRemoteCalendarIds ) {

    const offlineCal = await MicrosoftCalendar.getByRemoteCalendarId(microsoftCredentialId, remoteCalendarId)

    if (offlineCal) {
      createdCalendarIds.push(offlineCal.id)
    }

    if (!offlineCal) {
      const id = await MicrosoftCalendar.createLocal(microsoftCredentialId, remoteCalendarsById[remoteCalendarId][0])
      createdCalendarIds.push(id)
    }
  }

  return createdCalendarIds
}

MicrosoftCalendar.create = async (microsoftCredentialId, body) => {
  const microsoft = await getClient(microsoftCredentialId)
  const calendar  = await microsoft.createCalendar(body)

  return await MicrosoftCalendar.createLocal(microsoftCredentialId, calendar)
}

MicrosoftCalendar.getRemoteMicrosoftCalendars = async (microsoftCredential) => {
  const sameOwnerRemoteCalendarIds = await db.select('microsoft/calendar/get_same_owner_microsoft_calendars', [microsoftCredential.email, microsoftCredential.brand])
  const remoteCalendars            = await MicrosoftCalendar.listRemoteCalendars(microsoftCredential.id)
  const currentSyncedCalendars     = await MicrosoftCalendar.getAllByMicrosoftCredential(microsoftCredential.id)

  const currentSyncedRemoteCalendarIds = currentSyncedCalendars.map(record => record.calendar_id)

  let currentRechatRemoteCalendarId = null

  try {
    const currentRechatCalendar = await MicrosoftCalendar.get(microsoftCredential.microsoft_calendar)

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
      Every connected_accounts in any specific brand could have a unique rechat_microsoft_calendar
      So we exclude these remote rechat_microsoft_calendars
    */
    if ( !sameOwnerRemoteCalendarIds.includes(remoteCalendar.id) ) {

      const cal = {
        id: remoteCalendar.id,
        name: remoteCalendar.name || null,
        description: remoteCalendar.description || null,
        permission: remoteCalendar.canEdit ? 'read.write' : 'read',
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

// ???
MicrosoftCalendar.configureCalendars = async (credential, conf) => {
  if ( !credential.microsoft_calendar ) {
    await createRechatRemoteCal(credential)

  } else {

    const microsoft = await getClient(credential.id)

    const offlineCal = await MicrosoftCalendar.get(credential.microsoft_calendar)
    const remoteCal  = await microsoft.getCalendar(offlineCal.calendar_id)

    if (!remoteCal) {
      await handleRemoteDeletedCalendar(offlineCal)
      await createRechatRemoteCal(credential)
    }
  }


  if (conf.toStopSync) {
    for (const remoteId of conf.toStopSync) {
      const cal = await MicrosoftCalendar.getByRemoteCalendarId(credential.id, remoteId)

      if (!cal)
        throw Error.ResourceNotFound(`Microsoft calendar by id ${remoteId} not found.`)

        console.log('------------- toStopSync', cal)

      // await MicrosoftCalendar.stopWatchCalendar(cal)
    }
  }

  if (conf.toSync) {
    const ids       = await MicrosoftCalendar.persistRemoteCalendars(credential.id, conf.toSync)
    const calendars = await MicrosoftCalendar.getAll(ids)

    // for (const cal of calendars) {
    //   await MicrosoftCalendar.watchCalendar(cal)
    // }
  }

  try {
    await MicrosoftCredential.forceSync(credential.id)
  } catch (ex) {
    // do nothing
  }

  return
}


/*
MicrosoftCalendar.watch = async (calendar) => {
  const microsoft = await getClient(calendar.microsoft_credential)

  const options = {}

  return await microsoft.watchCalendar(options)
}

MicrosoftCalendar.stop = async (calendar) => {
  const microsoft = await getClient(calendar.microsoft_credential)

  const options = {}

  return await microsoft.stopWatchCalendar(options)
}

MicrosoftCalendar.watchCalendar = async (calendar) => {
  const result = await MicrosoftCalendar.watch(calendar)
  Context.log('SyncMicrosoft - watch', calendar.microsoft_credential, result)

  return await MicrosoftCalendar.updateWatcher(calendar.id, result.id, 'active', result)
}

MicrosoftCalendar.stopWatchCalendar = async (calendar) => {
  if ( calendar.watcher_status === 'stopped' )
    return

  await MicrosoftCalendar.stop(calendar)

  return await MicrosoftCalendar.updateWatcher(calendar.id, calendar.watcher.id, 'stopped')
}
*/


Orm.register('microsoft_calendar', 'MicrosoftCalendar', MicrosoftCalendar)

module.exports = MicrosoftCalendar