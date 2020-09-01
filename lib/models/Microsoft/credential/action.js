const { get } = require('./get')


/**
 * @param {UUID} id
 */
const hasSendEmailAccess = async (id) => {
  const credential = await get(id)

  if ( credential.scope_summary.includes('mail.send') && credential.scope_summary.includes('mail.modify') )
    return credential
  
  throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
}


module.exports = {
  hasSendEmailAccess
}