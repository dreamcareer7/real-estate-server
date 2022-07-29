const { keyBy } = require('lodash')

const db       = require('../../../utils/db.js')
const Brand    = require('../../../models/Brand/get')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/microsoft')

const MicrosoftCalendarEvent = {
  ...require('../calendar_events/get'),
  ...require('../calendar_events/delete')
}

const CalendarIntegration = {
  ...require('../../CalendarIntegration/get'),
  ...require('../../CalendarIntegration/delete')
}

const { resetRechatMicrosoftCalendar, updateRechatMicrosoftCalendar } = require('../credential/update')
const { subscribe, unsubscribe } = require('../workers/subscriptions/common')
const { get, getAll, getByRemoteCalendarId, getAllByMicrosoftCredential } = require('./get')
const { deleteLocalByRemoteCalendarId } = require('./delete')
const { createLocal }  = require('./create')
const { updateToSync } = require('./update')

const getClient = require('../client')


const subscribeCal = async (calendar) => {
  const microsoft = await getClient(calendar.microsoft_credential, 'calendar')
  
  const resource = `me/calendars/${calendar.calendar_id}/events`

  await updateToSync([calendar.id], true)
  await subscribe(microsoft, calendar.microsoft_credential, resource)
}

const unsubscribeCal = async (calendar) => {
  const microsoft = await getClient(calendar.microsoft_credential, 'calendar')

  const resource = `me/calendars/${calendar.calendar_id}/events`

  await updateToSync([calendar.id], false)
  await unsubscribe(microsoft, calendar.microsoft_credential, resource)
}

const resetPrimaryCalendar = async (credential) => {
  const cal = await get(credential.microsoft_calendar)

  const meventIds = await MicrosoftCalendarEvent.getByCalendarIds(credential.id, [cal.id])
  const records   = await CalendarIntegration.getByGoogleIds(meventIds)

  await MicrosoftCalendarEvent.deleteLocalByCalendar(cal)
  await deleteLocalByRemoteCalendarId(cal)

  const recordIds = records.map(r => r.id)
  await CalendarIntegration.deleteMany(recordIds)

  await resetRechatMicrosoftCalendar(credential.id)
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
  await updateRechatMicrosoftCalendar(credential.id, rechatCalendarId)
  const offlineCal = await get(rechatCalendarId)

  await subscribeCal(offlineCal)
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
  const remoteCalendarsById = keyBy(remoteCalendars, 'id')

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
  let microsoft
  try {
    microsoft = await getClient(credentialId, 'calendar')
    const calendar  = await microsoft.createCalendar(body)

    return await createLocal(credentialId, calendar)

  } catch (ex) {

    if ( ex.message === 'A folder with the specified name already exists.' ) {
      if(microsoft) {
        const calendars = await microsoft.listCalendars()
        const calendar = calendars?.value.find(x=> x.name === body.name)
        if(calendar) {
          return createLocal(credentialId, calendar)
        }
      }
      Context.log('MicrosoftCalendarCreate failed - Credential:', credentialId, ' - Message:', ex.message)
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
    Context.log('Microsoft getRemoteMicrosoftCalendars-Failed', err)
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
    Context.log('Microsoft-configureCalendars-Failed', credential.email, ' - Message:', ex.message, ' - Ex: ', ex)
  }
}


module.exports = {
  listRemoteCalendars,
  persistRemoteCalendars,
  create,
  getRemoteMicrosoftCalendars,
  configureCalendars
}