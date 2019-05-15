const config = require('../../config')
const db = require('../../utils/db.js')
const Orm = require('../Orm')
const Job = require('../Job')
const Context = require('../Context')

const ShowingsCredential = {}


const encrypt = async (input) => {
  return Crypto.encrypt(input)
}


ShowingsCredential.create = async (showingsCredential) => {
  const encryptedUsername = await encrypt(showingsCredential.username)
  const encryptedPassword = await encrypt(showingsCredential.password)

  return db.insert('showing/credential/insert',[
    showingsCredential.user,
    showingsCredential.brand,
    encryptedUsername,
    encryptedPassword
  ])
}

ShowingsCredential.get = async (showingsCredentialId) => {
  const showingsCredentials = await ShowingsCredential.getAll([showingsCredentialId])

  if (showingsCredentials.length < 1)
    throw Error.ResourceNotFound(`Notification ${showingsCredentialId} not found`)

  showingsCredentials[0].username = Crypto.decrypt(showingsCredentials[0].username)
  showingsCredentials[0].password = Crypto.decrypt(showingsCredentials[0].password)

  return showingsCredentials[0]
}

ShowingsCredential.getAll = async (credential_ids) => {
  const showingsCredentials = await db.select('showing/credential/get', [credential_ids])

  return showingsCredentials
}

ShowingsCredential.getByUser = async (user, brand) => {
  const ids = await db.select('showing/credential/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`ShowingsCredential by user ${user} and brand ${brand} not found`)

  return ShowingsCredential.get(ids[0].id)
}

ShowingsCredential.updateCredential = async (showingsCredentialId, body) => {
  const encryptedUsername = await encrypt(body.username)
  const encryptedPassword = await encrypt(body.password)

  return db.update('showing/credential/update', [
    encryptedUsername,
    encryptedPassword,
    showingsCredentialId
  ])
}

ShowingsCredential.delete = async (showingsCredentialId) => {
  await db.query.promise('showing/credential/delete', [showingsCredentialId])
}

ShowingsCredential.crawlerJob = async () => {
  const rows = await db.select('showing/credential/due', [config.showings.crawling_gap_hour])
  const ids = rows.map(r => r.id)

  let isFirstCrawl = true

  for(const showing_credential_id of ids) {
    const showingCredential = await ShowingsCredential.get(showing_credential_id)

    if( showingCredential.last_crawled_at )
      isFirstCrawl = false

    // action enum : showings / appoinmentsForBuyers
    const data = {
      meta: {
        isFirstCrawl: isFirstCrawl,
        action: 'showings'
      },
      showingCredential: showingCredential
    }

    const job = Job.queue.create('showings_crawler', data).removeOnComplete(true)
    Context.get('jobs').push(job)
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