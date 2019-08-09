const MicrosoftPlugin     = require('./graph.js')
const MicrosoftCredential = require('../credential')

const Context = require('../../Context')
const Slack   = require('../../Slack')


const handleException = async function(credential, ex) {
  const msg = 'Microsoft-client-Failed'
  Context.log(msg, JSON.stringify(ex), JSON.stringify(credential))

  let invalidGrant = false

  if ( ex.message === 'invalid_grant' )
    invalidGrant = true

  if (ex.response) {
    if (ex.response.body) {
      const body = JSON.parse(ex.response.body)

      if ( body.error === 'invalid_grant' )
        invalidGrant = true
    }
  }

  if (invalidGrant)
    await MicrosoftCredential.disableEnableSync(credential.id, 'disable')

  const obj = {
    id: credential.id,
    user: credential.user,
    brand: credential.brand,
    remote_id: credential.remote_id,
    email: credential.email,
    scope: credential.scope,
    revoked: credential.revoked,
    last_sync_at: credential.last_sync_at
  }

  Slack.send({ channel: '7-server-errors', text: `${msg} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: `${msg} - Info: ${JSON.stringify(obj)} - Exception: ${JSON.stringify(ex)}`, emoji: ':skull:' })
}

const getMGraphClient = async (credential) => {
  const microsoft = await MicrosoftPlugin.setupClient(credential)

  try {
    const newTokens = await microsoft.refreshToken()
    await MicrosoftCredential.updateTokens(credential.id, newTokens)

    return microsoft

  } catch (ex) {

    await handleException(credential, ex)

    return null
  }
}


module.exports = {
  getMGraphClient
}


/*

Handled Exceptions:

Exception: {"statusCode":-1,"code":null,"message":null,"requestId":null,"date":"2019-08-02T12:12:50.222Z","body":null}
Exception: {"statusCode":401,"code":"InvalidAuthenticationToken","message":"Unable to initialize RPS","requestId":"59d087c6-eac3-4766-aab3-32e03e626535","body":"{"code":"InvalidAuthenticationToken","message":"Unable to initialize RPS","innerError":{"request-id":"59d087c6-eac3-4766-aab3-32e03e626535"}}"}
Exception: {"name":"StatusCodeError","statusCode":400,"message":"400 - "{"error":"invalid_grant","error_description":"AADSTS70000: The user could not be authenticated or user interaction is required. The user must sign in again and if needed grant the client application access to the requested scope.Trace ID: 417dc89e-d13b-4857-9472-e2a40f066400Correlation ID: 3b25b30c-0158-4995-a7ee-ae3ba94258d9Timestamp: 2019-08-08 21:28:18Z","error_codes":[70000],"timestamp":"2019-08-08 21:28:18Z","trace_id":"417dc89e-d13b-4857-9472-e2a40f066400","correlation_id":"3b25b30c-0158-4995-a7ee-ae3ba94258d9"}

*/