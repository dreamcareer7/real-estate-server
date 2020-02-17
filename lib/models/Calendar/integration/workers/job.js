const Context = require('../../../Context')
// const Slack   = require('../../../Slack')
// const Socket  = require('../../../Socket')

const User = require('../../../User')
const MicrosoftCredential = require('../../../Microsoft/credential')
const GoogleCredential    = require('../../../Google/credential')

const { filter } = require('../../feed')
const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./google/dispatcher')


const faker = function(calEvents) {
  let crm_task = 0
  let contact  = 0
  let contact_attribute = 0
  let deal_context = 0
  let deleted_at   = 0

  const records = []

  for (const record of calEvents) {
    if ( deleted_at < 5 && record.deleted_at ) {
      deleted_at ++
      records.push(record)
      continue
    }

    if ( crm_task < 5 && record.object_type === 'crm_task' ) {
      crm_task ++
      records.push(record)
    }

    if ( contact < 5 && record.object_type === 'contact' ) {
      contact ++
      records.push(record)
    }

    if ( contact_attribute < 5 && record.object_type === 'contact_attribute' ) {
      contact_attribute ++
      records.push(record)
    }

    if ( deal_context < 5 && record.object_type === 'deal_context' ) {
      deal_context ++
      records.push(record)
    }
  }

  return records
}

const syncGoogleCalendar = async (data) => {
  const timestamp  = new Date()
  const credential = data.googleCredential
  const lastSyncAt = new Date(credential.calendars_last_sync_at).getTime() / 1000 || null
  const query      = lastSyncAt ? { last_updated_gt: lastSyncAt } : {}

  const user      = await User.get(credential.user)
  const calEvents = await filter(credential.brand, credential.user, query)
  
  Context.log('--- calEvents.length', calEvents.length)
  Context.log('--- calEvents', calEvents[0])

  const { created, updated, deleted } = await refineEvents(credential, calEvents, user.timezone)

  Context.log('--- created.length', created.length)
  Context.log('--- created', created[0])

  Context.log('--- updated.length', updated.length)
  Context.log('--- updated', updated[0])

  Context.log('--- deleted.length', deleted.length)
  Context.log('--- deleted', deleted[0])

  await handleCreatedEvents(credential, created)
  // await handleDeletedEvents(credential, deleted)
  // await handleUpdatedEvents(updated)

  await GoogleCredential.updateCalendarsLastSyncAt(credential.id, timestamp)
}

const syncMicrosoftCalendar = async (data) => {
  const timestamp  = new Date()
  const credential = data.microsoftCredential

  await MicrosoftCredential.updateCalendarsLastSyncAt(credential.id, timestamp)
}


module.exports = {
  syncGoogleCalendar,
  syncMicrosoftCalendar
}