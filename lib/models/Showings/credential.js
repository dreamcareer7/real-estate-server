const db = require('../../utils/db.js')
const Orm = require('../Orm')

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



ShowingsCredential.create = async (showingsCredential) => {
  return db.insert('showing/credential/insert',[
    showingsCredential.username,
    showingsCredential.password,
    showingsCredential.agent
  ])
}

ShowingsCredential.get = async (showingsCredentialId) => {
  const showingsCredentials = await ShowingsCredential.getAll([showingsCredentialId])

  if (showingsCredentials.length < 1)
    throw Error.ResourceNotFound(`Notification ${showingsCredentialId} not found`)

  return showingsCredentials[0]
}

ShowingsCredential.getAll = async (credential_ids) => {
  const showingsCredentials = await db.select('showing/credential/get', [credential_ids])

  return showingsCredentials
}

ShowingsCredential.getByAgent = async (agent) => {
  const showingsCredentials = await db.select('showing/credential/getByAgent', [agent])

  if (showingsCredentials.length < 1)
    throw Error.ResourceNotFound(`ShowingsCredential by agent ${agent} not found`)

  return showingsCredentials[0]
}

ShowingsCredential.update = async (showingsCredentialId, body) => {
  return db.update('showing/credential/update', [
    body.username,
    body.password,
    showingsCredentialId
  ])
}

ShowingsCredential.delete = async (showingsCredentialId) => {
  await db.query.promise('showing/credential/delete', [showingsCredentialId])
}

ShowingsCredential.sendDue = async () => {
  const rows = await db.select('showing/credential/due')

  const ids = rows.map(r => r.id)

  for(const showing_credential_id of ids)
    queue.create('showings_crawler', { showing_credential_id }).removeOnComplete(true)
}


Orm.register('showingsCredential', 'ShowingsCredential', ShowingsCredential)

module.exports = ShowingsCredential