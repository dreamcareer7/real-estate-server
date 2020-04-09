const _ = require('lodash')

const config  = require('../../../../../config')
const Orm     = require('../../../../Orm')
const Context = require('../../../../Context')

const CalendarIntegration    = require('../../../../CalendarIntegration')
const MicrosoftSubscription  = require('../../../subscription')
const MicrosoftCalendarEvent = require('../../../calendar_events')
const MicrosoftCalendar      = require('../../../calendar')
const Contact = require('../../../../Contact')
const User    = require('../../../../User')
const CrmTask = require('../../../../CRM/Task/index')

const getClient = require('../../../client')
const { subscribe, updateSub } = require('../common')
const { fetchEvents } = require('./common')

const _REASON = config.microsoft_integration.crm_task_update_reason



const getToSyncCalendars = async function (gcid) {
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(gcid)

  return  calendars.filter(cal => ( cal.to_sync && !cal.deleted_at ))
}

const syncCalendarEvents = async (microsoft, credential) => {
  let confirmedNum = 0

  try {
    const toSyncRemoteCalendars = await getToSyncCalendars(credential.id)
    
    for ( const calendar of toSyncRemoteCalendars ) {
      const { confirmed, cancelled, deltaLink } = await fetchEvents(microsoft, calendar)

      if ( confirmed.length === 0 && cancelled.length === 0 && deltaLink) {
        await MicrosoftCalendar.updateDeltaToken(calendar.id, deltaLink)
        continue
      }

      // const { oldEventsRemoteId, deletedEventRemoteIds, updatedEventRemoteIds, tasksByGoogleId, associationsMap } = await setupMapping(credential, calendar, confirmed, cancelled)

      // confirmedNum += confirmed.length

      // const normalEvents   = confirmed.filter(c => !deletedEventRemoteIds.includes(c.id) )
      // const restoredEvents = confirmed.filter(c => deletedEventRemoteIds.includes(c.id) )


      /***  Handle Confirmed(Created/Updated) Events ***/
      // const eventsByRemoteId = await hadnleConfirmedEvents(calendar, confirmed, oldEventsRemoteId, updatedEventRemoteIds, deletedEventRemoteIds)


      /***  Update CRM_TASK records  ***/
      // await updateCrmTasks(credential, updatedEventRemoteIds, eventsByRemoteId, associationsMap, tasksByGoogleId, normalEvents)


      /***  Restore CRM_TASK records  ***/
      // await restoreEvents(credential, restoredEvents, eventsByRemoteId, associationsMap)


      /***  Handle new CRM_TASK  ***/
      // await handleNewCrmTasks(credential, oldEventsRemoteId, eventsByRemoteId, associationsMap, normalEvents)


      /***  Handle Canceled(Deleted) Events  ***/
      // await hadnleCanceledEvents(credential, calendar, cancelled)


      /***  Update Calendar Sync Token  ***/
      await MicrosoftCalendar.updateDeltaToken(calendar.id, deltaLink)
    }

    const totalEventsNum = await MicrosoftCalendarEvent.getMCredentialEventsNum(credential.id)

    return  {
      status: true,
      ex: null,
      confirmedNum,
      totalNum: totalEventsNum[0]['count']
    }

  } catch (ex) {

    Context.log('SyncMicrosoftCalendar - syncCalendarEvents ex:', ex)

    return  {
      status: false,
      ex,
      confirmedNum,
      totalNum: 0
    }
  }
}


module.exports = {
  syncCalendarEvents
}