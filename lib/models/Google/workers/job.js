const { getGoogleClient } = require('../plugin/client.js')

const Context = require('../../Context')
const config  = require('../../../config')
const Slack   = require('../../Slack')
const Socket  = require('../../Socket')

const peopleProfileWorker = require('./profile/people_profile')
const gmailProfileWorker  = require('./profile/gmail_profile')

const messageWorker = require('./gmail/message')
const historyWorker = require('./gmail/history')

const contactGroupWorker = require('./contacts/contact_group')
const contactWorker      = require('./contacts/contact')

const calendarWorker       = require('./calendars/calendar')
const calendarEventsWorker = require('./calendars/events')

const GoogleCredential   = require('../credential')
const GoogleSyncHistory  = require('../sync_history')



const syncGoogle = async (data) => {
  const sync_start_time = new Date()

  const synced_threads_num  = 0
  const threads_total       = 0

  let synced_messages_num = 0
  let messages_total      = 0

  let synced_contacts_num = 0
  let contacts_total      = 0
  let sync_duration       = 0

  let synced_calendar_events_num = 0
  let calendar_events_total      = 0

  const currentGoogleCredential = await GoogleCredential.get(data.googleCredential.id)
  const googleJobDuplicateCheck = new Date(currentGoogleCredential.last_sync_at).getTime() !== new Date(data.googleCredential.last_sync_at).getTime()

  if ( googleJobDuplicateCheck || currentGoogleCredential.revoked || currentGoogleCredential.deleted_at ) {
    // await GoogleCredential.updateSyncStatus(currentGoogleCredential.id, 'success')
    Slack.send({ channel: 'integration_logs', text: `Google - Revoked: ${currentGoogleCredential.revoked} - Deleted_At: ${currentGoogleCredential.deleted_at} - Action: Job skipped`, emoji: ':skull:' })
    return
  }

  const google = await getGoogleClient(data.googleCredential)

  const addLastSyncRecord = async function(status) {
    return await GoogleSyncHistory.addSyncHistory({
      user: data.googleCredential.user,
      brand: data.googleCredential.brand,
      google_credential: data.googleCredential.id,
  
      synced_messages_num: synced_messages_num,
      messages_total: messages_total,
      synced_threads_num: synced_threads_num,
      threads_total: threads_total,
      synced_contacts_num: synced_contacts_num,
      contacts_total: contacts_total,
      synced_calendar_events_num: synced_calendar_events_num,
      calendar_events_total: calendar_events_total,
      sync_duration: sync_duration,
  
      status: status
    })
  }

  const handleException = async function(msg, ex) {
    if ( ex.statusCode === 401 )
      await GoogleCredential.disableEnableSync(data.googleCredential.id, 'disable')

    const obj = {
      id: data.googleCredential.id,
      email: data.googleCredential.email,
      revoked: data.googleCredential.revoked,
      last_sync_at: data.googleCredential.last_sync_at
    }

    Slack.send({ channel: '7-server-errors',  text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
    Slack.send({ channel: 'integration_logs', text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`, emoji: ':skull:' })

    const sync_finish_time = new Date() 
    sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

    await GoogleCredential.postponeSync(data.googleCredential.id)
    await addLastSyncRecord(false)

    return
  }

  const messagesFullSync = async function(hasLostState = false) {
    const syncMessagesResult = await messageWorker.syncMessages(google, data, hasLostState)
    if ( !syncMessagesResult.status ) {
      await handleException('Job Error - Google Sync Failed [sync-messages]', syncMessagesResult.ex)
      return
    }
    Context.log('SyncGoogle - syncMessagesResult', data.googleCredential.id, data.googleCredential.email, syncMessagesResult)

    synced_messages_num = syncMessagesResult.createdNum
    messages_total      = syncMessagesResult.totalNum
  }


  Context.log('SyncGoogle - start job', data.googleCredential.id, data.googleCredential.email)


  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.profile.includes(entry)) ) {

    const profileResult = await peopleProfileWorker.syncProfile(google, data)
    if ( !profileResult.status ) {
      await handleException('Job Error - Google Sync Failed [profile]', profileResult.ex)
      return
    }
    Context.log('SyncGoogle - profileResult', data.googleCredential.id, data.googleCredential.email, profileResult)
  }

  
  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.contacts.read.includes(entry)) ) {

    const contactGroupsResult = await contactGroupWorker.syncContactGroups(google, data)
    if ( !contactGroupsResult.status ) {
      await handleException('Job Error - Google Sync Failed [contact-groups]', contactGroupsResult.ex)
      return
    }
    Context.log('SyncGoogle - contactGroupsResult', data.googleCredential.id, data.googleCredential.email, contactGroupsResult)
  
    const contactsLastRsult = await contactWorker.syncContacts(google, data)
    if ( !contactsLastRsult.status ) {
      await handleException('Job Error - Google Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }
    Context.log('SyncGoogle - contactsLastRsult', data.googleCredential.id, data.googleCredential.email, contactsLastRsult)

    synced_contacts_num = contactsLastRsult.createdNum
    contacts_total      = contactsLastRsult.totalNum
  }


  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.gmail.read.includes(entry)) ) {
    
    const gmailProfileResult = await gmailProfileWorker.syncProfile(google, data)
    if ( !gmailProfileResult.status ) {
      await handleException('Job Error - Google Sync Failed [gmail-profile]', gmailProfileResult.ex)
      return
    }
    Context.log('SyncGoogle - gmailProfileResult', data.googleCredential.id, data.googleCredential.email, gmailProfileResult)

    if (data.googleCredential.messages_sync_history_id) {

      const partialSyncResult = await historyWorker.partialSync(google, data)

      if ( partialSyncResult.needsFullSync ) {

        Context.log('SyncGoogle - partialSyncResult Needs-FullSync', data.googleCredential.id, data.googleCredential.email)
        await messagesFullSync(true)

      } else {

        if ( !partialSyncResult.status ) {
          await handleException('Job Error - Google Sync Failed [partial-sync-messages]', partialSyncResult.ex)
          return
        }
        Context.log('SyncGoogle - partialSyncResult', data.googleCredential.id, data.googleCredential.email, partialSyncResult)
  
        synced_messages_num = partialSyncResult.createdNum
        messages_total      = partialSyncResult.totalNum
      }
      
    } else {
      
      await messagesFullSync()
    }
  }

  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.calendar.includes(entry)) ) {

    const calendarResult = await calendarWorker.syncCalendars(data)
    if ( !calendarResult.status ) {
      await handleException('Job Error - Google Sync Failed [calendars]', calendarResult.ex)
      return
    }
    Context.log('SyncGoogle - calendarResult', data.googleCredential.id, data.googleCredential.email, calendarResult)

    const calendarEventsResult = await calendarEventsWorker.syncCalendarEventss(google, data)
    if ( !calendarEventsResult.status ) {
      await handleException('Job Error - Google Sync Failed [calendar-eventss]', calendarEventsResult.ex)
      return
    }
    Context.log('SyncGoogle - calendarEventsResult', data.googleCredential.id, data.googleCredential.email, calendarEventsResult)

    synced_calendar_events_num = calendarEventsResult.createdNum
    calendar_events_total      = calendarEventsResult.totalNum
  }


  const sync_finish_time = new Date() 
  sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

  // Update as Success
  await GoogleCredential.updateLastSync(data.googleCredential.id, sync_finish_time, sync_duration)
  await addLastSyncRecord(true)

  Socket.send('Google.Contacts.Imported', data.googleCredential.user, [synced_contacts_num])
  Context.log('SyncGoogle - job Finish', data.googleCredential.id, data.googleCredential.email, sync_duration)

  return
}


module.exports = {
  syncGoogle
}
