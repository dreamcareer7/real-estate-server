const config = require('../../../../../../config')

const CalendarIntegration    = require('../../../../../CalendarIntegration')
const MicrosoftCalendarEvent = require('../../../../calendar_events')
const CrmTask = require('../../../../../CRM/Task/index')
// const Context = require('../../../../Context')

const _REASON = config.microsoft_integration.crm_task_update_reason


const pruneDeletedMicrosoftEvents = async (credential, records) => {
  if ( records.length === 0 ) {
    return
  }

  const recordIds    = records.map(r => r.id)
  const microsoftIds = records.filter(r => r.crm_task).map(r => r.microsoft_id)
  const crmTaskIds   = records.filter(r => r.crm_task).map(r => r.crm_task)
  
  // Context.log('---- pruneDeletedMicrosoftEvents recordIds', recordIds)
  // Context.log('---- pruneDeletedMicrosoftEvents microsoftIds', microsoftIds)
  // Context.log('---- pruneDeletedMicrosoftEvents crmTaskIds', crmTaskIds)

  await CalendarIntegration.deleteMany(recordIds)
  await MicrosoftCalendarEvent.deleteMany(microsoftIds)
  await CrmTask.remove(crmTaskIds, credential.user, _REASON)
}

const pruneOffTrackRechatEvents = async (records) => {
  if ( records.length === 0 ) {
    return
  }

  const recordIds = records.map(r => r.id)
  const microsoftIds = records.map(r => r.microsoft_id)
  
  // Context.log('---- pruneOffTrackRechatEvents recordIds', recordIds)
  // Context.log('---- pruneOffTrackRechatEvents microsoftIds', microsoftIds)

  await CalendarIntegration.deleteMany(recordIds)
  await MicrosoftCalendarEvent.deleteMany(microsoftIds)
}


module.exports = {
  pruneDeletedMicrosoftEvents,
  pruneOffTrackRechatEvents
}