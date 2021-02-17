const { findByUserBrand } = require('../credential/get')
const { getByGoogleIds }  = require('../../ContactIntegration/get')
const { getAll }          = require('../credential/getAll')
const { getByGoogleCredential }          = require('./get')
const { hardDelete: deleteIntegrations } = require('../../ContactIntegration/delete')
const { hardDelete: deleteGContacts }    = require('./delete')


/**
 * @param {UUID} google_credential
 */
const reset = async function (google_credential) {
  const gContacts   = await getByGoogleCredential(google_credential)
  const gcontactIds = gContacts.map(gc => gc.id)

  const integrations   = await getByGoogleIds(gcontactIds)
  const integrationIds = integrations.map(ci => ci.id)

  await deleteIntegrations(integrationIds)
  await deleteGContacts(gcontactIds)
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
const resetContactIntegration = async function (user, brand) {
  const credentialIds = await findByUserBrand(user, brand)
  const credentials   = await getAll(credentialIds)

  const promises = []

  for (const credential of credentials) {
    if (credential.revoked || credential.deleted_at || !credential.scope_summary.includes('contacts')) {
      promises.push(reset(credential.id))
    }
  }

  await Promise.all(promises)
}

module.exports = {
  resetContactIntegration
}