const Context = require('../Context')
const Slack   = require('../Slack')



function sendSlackMessage (text, ex) {
  Context.log(ex)

  Slack.send({ channel: '7-server-errors',  text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })
}

function checkCredentialUser (credential, user, brand) {
  if ( credential.user !== user ) {
    throw Error.Unauthorized('Invalid user credential.')
  }

  if ( credential.brand !== brand ) {
    throw Error.Unauthorized('Invalid brand credential.')
  }
}

function checkCredential (credential) {
  if ( credential.deleted_at ) {
    throw Error.BadRequest('Microsoft-Credential Is Deleted!')
  }

  if ( credential.revoked ) {
    throw Error.BadRequest('Your Microsoft-Account is already revoked!')
  }
}

function checkModifyAccess (credential, user, brand) {
  checkCredentialUser(credential, user, brand)
  checkCredential(credential)
}


module.exports = {
  sendSlackMessage,
  checkCredentialUser,
  checkCredential,
  checkModifyAccess
}