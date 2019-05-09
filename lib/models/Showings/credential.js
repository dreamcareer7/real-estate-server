const db = require('../../utils/db.js')

const queue = require('../../utils/queue.js')

const ShowingsCredential = {}
global['ShowingsCredential'] = ShowingsCredential

// const schema = {
//   type: 'object',
//   properties: {
//     agent: {
//       type: 'string',
//       uuid: true,
//       required: false
//     },

//     password: {
//       type: 'string',
//       required: true
//     },

//     username: {
//       type: 'string',
//       required: true
//     }
//   }
// }



ShowingsCredential.create = async function(showingsCredential) {
  return db.selectId(
    'showing/credential/insert',
    [
      showingsCredential.username,
      showingsCredential.password,
      showingsCredential.agent
    ]
  )
}

ShowingsCredential.get = async function(showingsCredentialId) {
  const showingsCredentials = db.query('showing/credential/get', [showingsCredentialId])

  if (showingsCredentials.length < 1)
    throw Error.ResourceNotFound(`ShowingsCredential ${showingsCredentialId} not found`)

  return showingsCredentials[0]
}

ShowingsCredential.getByAgent = async function(agent) {
  const showingsCredentials = db.query('showing/credential/getByAgent', [agent])

  if (showingsCredentials.length < 1)
    throw Error.ResourceNotFound(`ShowingsCredential by agent ${agent} not found`)

  return showingsCredentials[0]
}

ShowingsCredential.update = async function(showingsCredentialId, body, cb) {
  db.query(
    'showing/credential/update',
    [
      body.username,
      body.password,
      showingsCredentialId
    ],
    cb
  )
}

ShowingsCredential.delete = function(showingsCredentialId, cb) {
  db.query('showing/credential/delete', [showingsCredentialId], cb)
}

ShowingsCredential.sendDue = async () => {
  const rows = await db.select('showing/credential/due')

  const ids = rows.map(r => r.id)

  for(const showing_credential_id of ids)
    queue.create('showings_crawler', { showing_credential_id }).removeOnComplete(true)
}


module.exports = ShowingsCredential
