const config  = require('../../../../config')
const Context = require('../../../Context')
const CrmTask = require('../../../CRM/Task/index')
const CalendarIntegration    = require('../../../CalendarIntegration')
const MicrosoftSubscription  = require('../../subscription')
const MicrosoftCalendarEvent = require('../../calendar_events')
const MicrosoftCalendar      = require('../../calendar')

const { subscribe, updateSub } = require('./common')

const _REASON = config.microsoft_integration.crm_task_update_reason



const getToSyncCalendars = async function (gcid) {
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(gcid)

  return  calendars.filter(cal => ( cal.to_sync && !cal.deleted_at ))
}

const deleteLocalCalendar = async (cal) => {
  await MicrosoftCalendar.deleteLocalByRemoteCalendarId(cal)
  await MicrosoftCalendarEvent.deleteLocalByCalendar(cal)
}

const handleDeleteCalendars = async (credential, deletedCalendars) => {
  if (deletedCalendars.length === 0) {
    return
  }

  const promises = deletedCalendars.filter(cal => (cal.id !== credential.microsoft_calendar)).map(cal => deleteLocalCalendar(cal))
  await Promise.all(promises)

  const deletedIds = deletedCalendars.filter(cal => (cal.id !== credential.microsoft_calendar)).map(cal => cal.id)
  const meventIds  = await MicrosoftCalendarEvent.getByCalendarIds(credential.id, deletedIds)
  const records    = await CalendarIntegration.getByMicrosoftIds(meventIds)

  const recordIds  = records.filter(r => r.crm_task).map(r => r.id)
  await CalendarIntegration.deleteMany(recordIds)

  const crmTaskIds = records.filter(r => r.crm_task).map(r => r.crm_task)
  await CrmTask.remove(crmTaskIds, credential.user,_REASON)
}

const handleSubscription = async function (microsoft, credential, resource, oldSub = null, liveSub = null) {
  if (oldSub && liveSub) {
    Context.log('***** HandleCalendars, going to delete offlince/remote records and create a new sub')
  }

  if (oldSub && !liveSub) {
    Context.log('***** HandleCalendars, going to delete offlince record and create a new sub')
  }

  if (!oldSub && !liveSub) {
    Context.log('***** HandleCalendars, fresh sub')
  }

  if (oldSub) {
    await MicrosoftSubscription.delete(oldSub.id)
  }

  if (liveSub) {
    await microsoft.deleteSubscription(liveSub.id)
  }

  await subscribe(microsoft, credential.id, resource)
}

const HandleCalendars = async (microsoft, credential) => {
  try {
    const toSyncLocalCalendars    = await getToSyncCalendars(credential.id)
    const toSyncRemoteCalendarIds = toSyncLocalCalendars.map(record => record.calendar_id)

    // It is possibe that some of the remote calendars are deleted
    // So we call persistRemoteCalendars to update offline calendars and exclude deleted ones.
    const result          = await MicrosoftCalendar.persistRemoteCalendars(credential, toSyncRemoteCalendarIds)
    const activeCalendars = await MicrosoftCalendar.getAll(result.activeCalendarIds)

    // Handle deletion of other-calendars (all of theses microsoft-calendars contains only crm_task events)
    await handleDeleteCalendars(credential, result.deletedCalendars)

    const temp = result.deletedCalendars.filter(cal => (cal.id === credential.microsoft_calendar))

    // Rechat primary calendar is deleted
    if (temp.length === 1) {
      return  {
        status: true,
        ex: 'rechat-primary-cal-is-deleted'
      }
    }

    for (const calendar of activeCalendars) {
      const resource = calendar.resource.split('/')[2]

      const sub = await MicrosoftSubscription.getByResource(credential.id, resource)
      Context.log('***** HandleCalendars sub', sub)

      if (sub) {
        const liveSub = await microsoft.getSubscription(sub.subscription_id)
  
        if (liveSub) {

          if ( sub.subscription_id === liveSub.id ) {
            const now = new Date().getTime()
            const exp = new Date(liveSub.expiration_date_time).getTime()
            const gap = 60 * 60 * 1000

            if ( (exp - now) / gap < 24 ) {
              Context.log('***** HandleCalendars, going to update sub')
              await updateSub(microsoft, sub)
            }

            continue
          }

          await handleSubscription(microsoft, credential, resource, sub, liveSub)

        } else {

          await handleSubscription(microsoft, credential, resource, sub)
        }
    
      } else {

        await handleSubscription(microsoft, credential, resource)
      }
    }

    return  {
      status: true,
      ex: null
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  HandleCalendars
}