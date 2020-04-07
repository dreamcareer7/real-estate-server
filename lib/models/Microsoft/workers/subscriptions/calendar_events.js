const _ = require('lodash')

const config  = require('../../../../config')
const Orm     = require('../../../Orm')
const Context = require('../../../Context')

const CalendarIntegration    = require('../../../CalendarIntegration')
const MicrosoftSubscription  = require('../../subscription')
const MicrosoftCalendarEvent = require('../../calendar_events')
const MicrosoftCalendar      = require('../../calendar')
const Contact = require('../../../Contact')
const User    = require('../../../User')
const CrmTask = require('../../../CRM/Task/index')

const getClient = require('../../client')
const { subscribe, updateSub } = require('./common')

const _REASON = config.microsoft_integration.crm_task_update_reason


const getToSyncCalendars = async function (gcid) {
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(gcid)

  return  calendars.filter(cal => ( cal.to_sync && !cal.deleted_at ))
}

const syncCalendarEvents = async (microsoft, credential, resourceId) => {

}


module.exports = {
  syncCalendarEvents
}