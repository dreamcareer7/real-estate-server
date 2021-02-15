const Contact = require('../Contact/emitter')
const IntegrationWorkers = require('./workers/index')


async function handleUpdateEvent({ contact_ids, reason }) {
  if ( !contact_ids || contact_ids.length === 0 ) {
    return
  }

  IntegrationWorkers.resetEtagByContact({ contact_ids, reason, event: 'update' })
}

async function handleDeleteEvent({ contact_ids, reason }) {
  if ( !contact_ids || contact_ids.length === 0 ) {
    return
  }

  IntegrationWorkers.resetEtagByContact({ contact_ids, reason, event: 'delete' })
}


module.exports = function attachEventHandlers() {
  Contact.on('update', handleUpdateEvent)
  Contact.on('delete', handleDeleteEvent)
}