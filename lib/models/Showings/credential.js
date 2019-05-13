const db = require('../../utils/db.js')
const Orm = require('../Orm')

const queue = require('../../utils/queue.js')

const ShowingsCredential = {}

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
  const ids = await db.select('showing/credential/getByAgent', [agent])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`ShowingsCredential by agent ${agent} not found`)

  return ShowingsCredential.get(ids[0].id)
}

ShowingsCredential.updateCredential = async (showingsCredentialId, body) => {
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

  let data
  let isFirstCrawl = true

  for(const showing_credential_id of ids) {
    const showingCredential = await ShowingsCredential.get(showing_credential_id)

    if( showingCredential.last_crawled_at )
      isFirstCrawl = false

    // action enum : showings / appoinmentsForBuyers
    data = {
      meta: {
        isFirstCrawl: isFirstCrawl,
        action: 'showings'
      },
      showingCredential: showingCredential
    }

    queue.create('showings_crawler', data).removeOnComplete(true)
  }

  return ids
}

ShowingsCredential.updateLastCrawledDate = async (showingsCredentialId, lastCrawledTS) => {
  await db.update('showing/credential/last_crawled', [
    new Date(lastCrawledTS),
    showingsCredentialId
  ])
}


Orm.register('showingsCredential', 'ShowingsCredential', ShowingsCredential)

module.exports = ShowingsCredential