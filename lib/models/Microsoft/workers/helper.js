const Slack    = require('../../Slack')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/microsoft')
const { disconnect } = require('../credential/update')



const postpone = async (credential, jobName, ex) => {
  // delete ex.options
  // delete ex.response

  Context.log('Postpone-Microsoft-Job', credential.id, jobName, ex.statusCode, ex.message, ex)

  let interval = '5 minutes'

  if ( ex.statusCode === 429 ) {
    interval = '60 minutes'
  }

  const fiveXErr = [500, 501, 502, 503, 504]

  if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {
    interval = '10 minutes'
  }

  await UsersJob.postponeByMicrosoftCredential(credential.id, jobName, interval)
}

const handleException = async (credential, jobName, msg, ex) => {
  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - StatusCode: ${ex.statusCode} - Message: ${ex.message} - Info: ${JSON.stringify(obj)}`
  const emoji = ':skull:'

  let invalidGrant = false

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    invalidGrant = true
  }

  if (ex.response) {
    if (ex.response.body) {
      const body = JSON.parse(ex.response.body)

      if ( body.error === 'invalid_grant' ) {
        invalidGrant = true
      }
    }
  }


  // Operations
  Slack.send({ channel: 'integration_logs', text, emoji })

  if (invalidGrant) {
    await disconnect(credential.id)
    await UsersJob.deleteByMicrosoftCredential(credential.id)
  } else {  
    await UsersJob.upsertByMicrosoftCredential(credential, jobName, 'failed')
    await postpone(credential, jobName, ex)
  }
}


module.exports = {
  postpone,
  handleException
}