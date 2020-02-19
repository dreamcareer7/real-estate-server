const Context = require('../../Context')

const User = require('../../User')
const GoogleCredential = require('../credential')

const { filter } = require('../../Calendar/feed')
const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./calendars/dispatcher')



const syncCalendar = async (data) => {
  const timestamp  = new Date()
  const credential = data.googleCredential
  
  const last_updated_gt = new Date(credential.calendars_last_sync_at).getTime() / 1000 || null
  const query           = last_updated_gt ? { last_updated_gt } : {}

  const user      = await User.get(credential.user)
  const calEvents = await filter(credential.brand, credential.user, query)

  // const lastEvent   = calEvents[calEvents.length - 1] // check order
  // const lastEventTS = lastEvent.last_updated_gt // check last succesfull saved event

  let errorFlag = false

  const { created, updated, deleted } = await refineEvents(credential, calEvents, user.timezone)


  Context.log('--- calEvents.length', calEvents.length)
  // Context.log('--- calEvents', calEvents[0])

  Context.log('--- created.length', created.length)
  // Context.log('--- created', created[0])

  Context.log('--- updated.length', updated.length)
  // Context.log('--- updated', updated[0])

  Context.log('--- deleted.length', deleted.length)
  // Context.log('--- deleted', deleted[0])



  if ( created.length !== 0 ) {
    const { result, error } = await handleCreatedEvents(credential, created.slice(0, 15))
    console.log('---- handleCreatedEvents result', result.length)

    if (error) {
      errorFlag = true
    }
  }

  if ( updated.length !== 0 ) {
    const { error } = await handleUpdatedEvents(credential, updated.slice(0, 3))

    if (error) {
      errorFlag = true
    }
  }

  if ( deleted.length !== 0 ) {
    await handleDeletedEvents(credential, deleted)
  }


  if (!errorFlag) {
    await GoogleCredential.updateCalendarsLastSyncAt(credential.id, timestamp)
  }
}


module.exports = {
  syncCalendar
}