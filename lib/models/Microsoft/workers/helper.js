const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/microsoft')


const postpone = async (credential, jobName, ex) => {
  Context.log('Postpone-Microsoft-Job', credential.id, jobName, ex.code, ex.message, ex.errors)

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


module.exports = {
  postpone
}