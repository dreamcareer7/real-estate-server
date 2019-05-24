const config = require('../../config')
const db = require('../../utils/db.js')
const Orm = require('../Orm')
const Job = require('../Job')
const Context = require('../Context')

const credentialValidator = require('./credential_validator')

const ShowingsCredential = {}


ShowingsCredential.create = async (user, brand, body) => {
  const encryptedUsername = await Crypto.encrypt(body.username)
  const encryptedPassword = await Crypto.encrypt(body.password)

  if ( !credentialValidator(body.selectedLocation, body.selectedLocationString) )
    throw Error.BadRequest('selectedLocation inputs are not valid!')

  return db.insert('showing/credential/insert',[
    user,
    brand,
    encryptedUsername,
    encryptedPassword,
    body.selectedLocation,
    body.selectedLocationString,
    body.loginStatus || false
  ])
}

ShowingsCredential.get = async (showingsCredentialId) => {
  const showingsCredentials = await ShowingsCredential.getAll([showingsCredentialId])

  if (showingsCredentials.length < 1)
    throw Error.ResourceNotFound(`ShowingCredential ${showingsCredentialId} not found`)

  const credentilRecord = showingsCredentials[0]

  credentilRecord.username = Crypto.decrypt(credentilRecord.username)
  credentilRecord.password = Crypto.decrypt(credentilRecord.password)

  return credentilRecord
}

ShowingsCredential.getAll = async (credential_ids) => {
  const showingsCredentials = await db.select('showing/credential/get', [credential_ids])

  return showingsCredentials
}

ShowingsCredential.getByUser = async (user, brand) => {
  const ids = await db.selectIds('showing/credential/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`ShowingsCredential by user ${user} and brand ${brand} not found`)

  return ShowingsCredential.get(ids[0])
}

ShowingsCredential.publicize = async model => {
  delete model.password

  return model
}

ShowingsCredential.updateCredential = async (user, brand, body) => {
  const encryptedUsername = await Crypto.encrypt(body.username)
  const encryptedPassword = await Crypto.encrypt(body.password)

  return db.update('showing/credential/update', [
    encryptedUsername,
    encryptedPassword,
    body.selected_location,
    body.selected_location_string,
    user,
    brand
  ])
}

ShowingsCredential.updateCredentialLoginStatus = async (user, brand, loginStatus) => {
  return db.update('showing/credential/update_loging_status', [
    user,
    brand,
    loginStatus
  ])
}

ShowingsCredential.delete = async (user, brand) => {
  await db.query.promise('showing/credential/delete', [user, brand])
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