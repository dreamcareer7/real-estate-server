const Slack    = require('../../Slack')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/microsoft')
const { disconnect } = require('../credential/update')



const lockJob = async (credential, jobName) => {
  /*
    Lock users_jobs record

    select * from users_jobs where microsoft_credential = credential.id AND job_name = JOB_NAME FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */

  await UsersJob.lockByMicrosoftCredential(credential.id, jobName)
  await UsersJob.upsertByMicrosoftCredential(credential, jobName, 'pending')
}

const reportFailure = async (credential, error) => {
  const emoji = ':skull:'
  const text  = `SyncMicrosoftCalendar - Job Finished With Failure ${credential.id} - ${credential.email} - ${error}`

  Slack.send({ channel: 'integration_logs', text, emoji })
}

const postpone = async (credential, jobName, ex) => {
  delete ex.options
  delete ex.response

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