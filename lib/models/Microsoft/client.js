const config = require('../../config')

const MicrosoftCredential = require('./credential')
const { getMockClient, getMGraphClient } = require('./plugin/client')

const SCOPE_OUTLOOK_READ = config.microsoft_scopes.mail.read[0]
const SCOPE_OUTLOOK_CAL  = config.microsoft_scopes.calendar[0]



/**
 * @param {UUID} cid microsoft_credential_id
 */
const getClient = async (cid, scope) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  let SCOPE = ''

  if ( scope === 'calendar' ) {
    SCOPE = SCOPE_OUTLOOK_CAL
  }

  if ( scope === 'outlook' ) {
    SCOPE = SCOPE_OUTLOOK_READ
  }

  const credential = await MicrosoftCredential.get(cid)

  if (credential.revoked) {
    throw Error.BadRequest('Microsoft-Credential is revoked!')
  }

  if (credential.deleted_at) {
    throw Error.BadRequest('Microsoft-Credential is deleted!')
  }

  if (!credential.scope.includes(SCOPE)) {
    throw Error.BadRequest('Access is denied! Insufficient permission.')
  }

  // { microsoft, invalidGrant }
  const { microsoft } = await getMGraphClient(credential)

  if (!microsoft) {
    throw Error.BadRequest('Microsoft-Client failed!')
  }

  return microsoft
}


module.exports = getClient