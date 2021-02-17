const config = require('../../../config')

const G_REASON = config.google_integration.contact_update_reason
const M_REASON = config.microsoft_integration.contact_update_reason

const { resetEtagByContact } = require('../update')



const resetEtag = async ({ contact_ids, reason, event }) => {
  if ( reason !== G_REASON && reason !== M_REASON ) {
    await resetEtagByContact(contact_ids, 'rechat', event)
  }

  if ( reason === G_REASON ) {
    await resetEtagByContact(contact_ids, 'google', event)
  }

  if ( reason === M_REASON ) {
    await resetEtagByContact(contact_ids, 'microsoft', event)
  }
}

module.exports = {
  resetEtag
}