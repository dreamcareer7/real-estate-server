const sql = require('../../../utils/sql')
const config  = require('../../../config')

const Context = require('../../Context')
const CrmTask = require('../../CRM/Task/upsert')

const UserJob = require('../../UsersJob/microsoft')
const Subscription = {
  ...require('../subscription/upsert'),
  ...require('../subscription/get'),
}
const { updateRechatMicrosoftCalendar } = require('../credential')
const MicrosoftCalendar = require('../calendar/get')
const MicrosoftApi = require('../plugin/client')

const _REASON = config.microsoft_integration.crm_task_update_reason

/**
 * @param {IMicrosoftCredential} credential 
 */
async function stopCalendarSubscriptions(credential, microsoft) {
  const subs = await Subscription.getByCredential(credential.id)
  const to_delete = subs
    .filter(s => s.resource.startsWith('me/calendars/'))
    
  await microsoft.batchDeleteSubscription(to_delete.map(s => s.subscription_id))
  await Subscription.deleteMany(to_delete.map(s => s.id))
}

/**
 * @param {IMicrosoftCredential} credential 
 */
const resetSyncState = async (credential) => {
  if (credential.revoked) {
    return
  }

  Context.log('MicrosoftCalendarResetSync - Job Started', credential.id, credential.email)

  const { microsoft, invalidGrant } = await MicrosoftApi.getMGraphClient(credential)
  if (invalidGrant) {
    Context.log('MicrosoftCalendarResetSync - Job Failed - Invalid Grant found on the credential')
    return
  }

  await UserJob.deleteByMicrosoftCredentialAndJob(credential.id, 'calendar')

  await stopCalendarSubscriptions(credential, microsoft)
  
  if (credential.microsoft_calendar) {
    const rechatCalendar = await MicrosoftCalendar.get(credential.microsoft_calendar)

    await microsoft.deleteCalendar(rechatCalendar.calendar_id)
    await updateRechatMicrosoftCalendar(credential.id, null)
  }

  const crm_tasks = await sql.selectIds(`
    SELECT
      ci.crm_task AS id
    FROM
      crm_tasks AS t
      JOIN calendar_integration AS ci
        ON ci.crm_task = t.id
      JOIN microsoft_calendar_events AS ce
        ON ci.microsoft_id = ce.id
    WHERE
      crm_task IS NOT NULL
      AND t.deleted_at IS NULL
      AND ce.microsoft_credential = $1::uuid
  `, [ credential.id ])

  await CrmTask.remove(crm_tasks, credential.user, _REASON)

  await sql.update(`
    DELETE FROM
      calendar_integration
    WHERE
      microsoft_id IN (
        SELECT
          id
        FROM
          microsoft_calendar_events
        WHERE
          microsoft_credential = $1::uuod
      );
  `, [ credential.id ])

  await sql.update(`
    DELETE FROM
      microsoft_calendars
    WHERE
      microsoft_credential = $1::uuid
  `, [ credential.id ])

  await sql.update(`
    DELETE FROM
      microsoft_calendar_events
    WHERE
      microsoft_credential = $1::uuid
  `, [ credential.id ])

  Context.log('MicrosoftCalendarResetSync - Job Finished')
}

module.exports = {
  resetSyncState,
}
