const config = require('../../../../../config')

const GoogleCalendarEvent = require('../../../calendar_events')
const CalendarIntegration = require('../../../../CalendarIntegration')
const CrmTask = require('../../../../CRM/Task/index')

const _REASON = config.google_integration.crm_task_update_reason


const pruneDeletedGoogleEvents = async (credential, records) => {
  if ( records.length === 0 ) {
    return
  }

  const recordIds  = records.map(r => r.id)
  const googleIds  = records.filter(r => r.crm_task).map(r => r.google_id)
  const crmTaskIds = records.filter(r => r.crm_task).map(r => r.crm_task)

  await CalendarIntegration.deleteMany(recordIds)
  await GoogleCalendarEvent.deleteMany(googleIds)
  await CrmTask.remove(crmTaskIds, credential.user, _REASON)
}

const pruneOffTrackRechatEvents = async (records) => {
  if ( records.length === 0 ) {
    return
  }

  const recordIds = records.map(r => r.id)
  const googleIds = records.map(r => r.google_id)
  
  await CalendarIntegration.deleteMany(recordIds)
  await GoogleCalendarEvent.deleteMany(googleIds)
}


module.exports = {
  pruneDeletedGoogleEvents,
  pruneOffTrackRechatEvents
}