const Slack   = require('../../Slack')
const Context = require('../../Context')

const { postponeByMicrosoftCredential, deleteByMicrosoftCredential } = require('../../UsersJob/microsoft')
const { updateStatus } = require('../../UsersJob/update')
const { lock } = require('../../UsersJob/lock')

const { disconnect } = require('../credential/update')



const lockJob = async (userJob) => {
  await lock(userJob.id)
  await updateStatus(userJob.id, 'pending')
}

const reportFailure = async (cid, error) => {
  const emoji = ':skull:'
  const text  = `SyncMicrosoftCalendar - Job Finished With Failure ${cid} - ${error}`

  Slack.send({ channel: 'integration_logs', text, emoji })
}

const postpone = async (userJob, ex) => {
  delete ex.options
  delete ex.response

  Context.log('Postpone-Microsoft-Job', userJob.microsoft_credential, userJob.job_name, ex.statusCode, ex.message, ex)

  let interval = '5 minutes'

  if ( ex.statusCode === 429 ) {
    interval = '60 minutes'
  }

  const fiveXErr = [500, 501, 502, 503, 504]

  if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {
    interval = '10 minutes'
  }

  await postponeByMicrosoftCredential(userJob.microsoft_credential, userJob.job_name, interval)
}

const handleException = async (userJob, msg, ex) => {
  const text  = `${msg} - StatusCode: ${ex.statusCode} - Message: ${ex.message} - CID: ${userJob.microsoft_credential}`
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
    await disconnect(userJob.microsoft_credential)
    await deleteByMicrosoftCredential(userJob.microsoft_credential)
  } else {  
    await updateStatus(userJob.id, 'failed')
    await postpone(userJob, ex)
  }
}


module.exports = {
  lockJob,
  reportFailure,
  postpone,
  handleException
}


/*
  GraphError: {
    statusCode: 500,
    code: 'ExtensionError',
    message: 'Operation: Read; Exception: [A device attached to the system is not functioning]',
    requestId: '79739241-2321-42bf-9465-f9923431d93e',
    date: 2020-11-20T14:10:24.000Z,
    body: '{"code":"ExtensionError","message":"Operation: Read; Exception: [A device attached to the system is not functioning.\\r\\n]","innerError":{"date":"2020-11-20T14:10:24","request-id":"79739241-2321-42bf-9465-f9923431d93e","client-request-id":"aee8f031-0baa-16e0-edf8-82b13e1d8106"}}'
  }
*/