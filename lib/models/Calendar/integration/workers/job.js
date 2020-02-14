const Context = require('../../../Context')
// const Slack   = require('../../../Slack')
// const Socket  = require('../../../Socket')

const User = require('../../../User')
const MicrosoftCredential = require('../../../Microsoft/credential')
const GoogleCredential    = require('../../../Google/credential')

const { filter } = require('../../feed')
const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./google/dispatcher')


const faker = function(calEvents) {
  let crm_task = false
  let contact = false
  let contact_attribute = false
  let deal_context = false
  let deleted_at = false

  const records = []

  for (const record of calEvents) {
    // console.log('record.deleted_at', record.deleted_at)

    if ( !deleted_at && record.deleted_at ) {
      deleted_at = true
      records.push(record)
      continue
    }

    if ( !crm_task && record.object_type === 'crm_task' ) {
      crm_task = true
      records.push(record)
    }

    if ( !contact && record.object_type === 'contact' ) {
      contact = true
      records.push(record)
    }

    if ( !contact_attribute && record.object_type === 'contact_attribute' ) {
      contact_attribute = true
      records.push(record)
    }

    if ( !deal_context && record.object_type === 'deal_context' ) {
      deal_context = true
      records.push(record)
    }
  }

  return records
}

const syncGoogleCalendar = async (data) => {
  const timestamp     = new Date()
  const unixTimestamp = timestamp.getTime()
  const credential    = data.googleCredential
  const query         = { low: credential.calendars_last_sync_at, high: unixTimestamp }

  const user      = await User.get(credential.user)
  const calEvents = await filter(credential.brand, credential.user, query)
  
  const records = faker(calEvents)
  const { created, updated, deleted } = await refineEvents(credential, records, user.timezone)

  Context.log('--- created', created)
  Context.log('--- updated', updated)
  Context.log('--- deleted', deleted)

  await handleCreatedEvents(credential, created)
  await handleDeletedEvents(credential, deleted)
  await handleUpdatedEvents(updated)

  // await GoogleCredential.updateCalendarsLastSyncAt(credential.id, timestamp)
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