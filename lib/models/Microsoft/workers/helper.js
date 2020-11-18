const UsersJob = require('../../UsersJob/google')


const postpone = async (credential, jobName, ex) => {
  let interval = '5 minutes'

  if ( ex.statusCode === 429 ) {
    interval = '30 minutes'
  }

  const fiveXErr = [500, 501, 502, 503, 504]

  if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {
    interval = '10 minutes'
  }

  await UsersJob.postponeByGoogleCredential(credential.id, jobName, interval)
}


module.exports = {
  postpone
}