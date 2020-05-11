const config = require('../../config')

const GoogleCredential = require('./credential')
const { getMockClient, getGoogleClient } = require('./plugin/client.js')

const SCOPE_GMAIL_READONLY = config.google_scopes.gmail.readonly[0]
const SCOPE_GOOGLE_CAL     = config.google_scopes.calendar[0]


/**
 * @param {UUID} cid google_credential_id
 */
const getClient = async (cid, scope) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  let SCOPE = ''

  if ( scope === 'calendar' ) {
    SCOPE = SCOPE_GOOGLE_CAL
  }

  if ( scope === 'gmail' ) {
    SCOPE = SCOPE_GMAIL_READONLY
  }

  const credential = await GoogleCredential.get(cid)

  // if (credential.revoked) {
  //   throw Error.BadRequest('Google-Credential is revoked!')
  // }

  // if (credential.deleted_at) {
  //   throw Error.BadRequest('Google-Credential is deleted!')
  // }

  if (!credential.scope.includes(SCOPE)) {
    throw Error.BadRequest('Access is denied! Insufficient permission.')
  }

  const google = await getGoogleClient(credential)

  if (!google) {
    throw Error.BadRequest('Google-Client failed!')
  }

  return google
}


module.exports = getClient