const Slack    = require('../../Slack')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/google')
const { disconnect } = require('../credential/update')



const postpone = async (credential, jobName, ex) => {
  Context.log('Postpone-Google-Job', credential.id, jobName, ex.code, ex.statusCode, ex.message, ex.errors)

  let interval = '5 minutes'
  let rateLimitExceeded = false

  const fiveXErr = [500, 501, 502, 503, 504]
  const limitExceededRreasons = ['dailyLimitExceeded', 'userRateLimitExceeded', 'rateLimitExceeded']

  if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {
    interval = '10 minutes'
  }

  if ( ex.errors && ex.errors.length ) {
    if (limitExceededRreasons.includes(ex.errors[0].reason)) {
      rateLimitExceeded = true
    }
  }

  if ( ex.statusCode === 429 || ex.code === 429 ) {
    interval = '30 minutes'
  }

  if ( ex.code === 403 && rateLimitExceeded ) {
    interval = '24 hours'
  }

  await UsersJob.postponeByGoogleCredential(credential.id, jobName, interval)
}

const handleException = async (credential, jobName, msg, ex) => {
  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - StatusCode: ${ex.statusCode || ex.code} - Message: ${ex.message} - Info: ${JSON.stringify(obj)}`
  const emoji = ':skull:'

  const invalidGrantsCodes = [ex.statusCode, ex.code]
  const invalidGrantsMsgs  = ['invalid_grant', 'Invalid Credentials']

  let invalidGrant = false

  if ( invalidGrantsCodes.includes(401) || invalidGrantsMsgs.includes(ex.message) ) {
    invalidGrant = true
  }


  // Operations
  Slack.send({ channel: 'integration_logs', text, emoji })

  if (invalidGrant) {
    await disconnect(credential.id)
    await UsersJob.deleteByGoogleCredential(credential.id)
  } else {  
    await UsersJob.upsertByGoogleCredential(credential, jobName, 'failed')
    await postpone(credential, jobName, ex)
  }
}


module.exports = {
  postpone,
  handleException
}


/*
  GaxiosError Structure
  Request additional quota: https://developers.google.com/gmail/api/guides/handle-errors

  invalid_grant => https://blog.timekit.io/google-oauth-invalid-grant-nightmare-and-how-to-fix-it-9f4efaf1da35
  rate limit => https://developers.google.com/gmail/api/v1/reference/quota (ex.statusCode: 429)
*/