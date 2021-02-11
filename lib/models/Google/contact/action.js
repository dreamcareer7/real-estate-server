const { getByRechatContacts } = require('./get')
const { getByGoogleIds } = require('../../ContactIntegration/get')
const { hardDelete: deleteIntegrations } = require('../../ContactIntegration/delete')
const { hardDelete: deleteGContacts } = require('./delete')


/**
 * @param {UUID} google_credential
 * @param {UUID[]} cids Rechat contact ids
 */
const resetContactIntegration = async function (google_credential, cids) {
  const gContacts   = await getByRechatContacts(google_credential, cids)
  const gcontactIds = gContacts.map(gc => gc.id)

  const integrations   = await getByGoogleIds(gcontactIds)
  const integrationIds = integrations.map(ci => ci.id)

  await deleteIntegrations(integrationIds)
  await deleteGContacts(gcontactIds)
}


module.exports = {
  resetContactIntegration
}