const { getByMicrosoftIds } = require('../../ContactIntegration/get')
const { findByUserBrand }   = require('../credential/get')
const { getAll }            = require('../credential/getAll')
const { getByMicrosoftCredential }       = require('./get')
const { hardDelete: deleteIntegrations } = require('../../ContactIntegration/delete')
const { hardDelete: deleteGContacts }    = require('./delete')


/**
 * @param {UUID} microsoft_credential
 */
const reset = async function (microsoft_credential) {
  const mContacts   = await getByMicrosoftCredential(microsoft_credential)
  const mcontactIds = mContacts.map(gc => gc.id)

  const integrations   = await getByMicrosoftIds(mcontactIds)
  const integrationIds = integrations.map(ci => ci.id)

  await deleteIntegrations(integrationIds)
  await deleteGContacts(mcontactIds)
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