const config  = require('../../config')
const Context = require('../Context')
const Slack   = require('../Slack')

const channel = config.google_integration.slack_channel


function sendSlackMessage (text, ex) {
  Context.log('GM-Failure', text, ex)

  Slack.send({ channel, text, emoji: ':skull:' })
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
    throw Error.BadRequest('Google-Credential Is Deleted!')
  }

  if ( credential.revoked ) {
    throw Error.BadRequest('Your Google-Account is already revoked!')
  }
}

function checkModifyAccess (credential, user, brand) {
  checkCredentialUser(credential, user, brand)
  checkCredential(credential)

  if ( !credential.scope_summary.includes('mail.modify') ) {
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
  }
}


module.exports = {
  sendSlackMessage,
  checkCredentialUser,
  checkCredential,
  checkModifyAccess
}