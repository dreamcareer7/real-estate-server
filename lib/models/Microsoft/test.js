// const _   = require('lodash')
// const Orm = require('./../Orm')
// const Context = require('../Context')
const config  = require('../../config')

const MicrosoftCredential = require('./credential')
const subscriptionWorker  = require('./workers/subscriptions')
const { getMGraphClient } = require('./plugin/client.js')

const SCOPE_OUTLOOK_READ = config.microsoft_scopes.mail.read[0]



const getMicrosoftClient = async (credential) => {
  // if (credential.revoked)
  //   throw Error.BadRequest('Microsoft-Credential is revoked!')

  // if (credential.deleted_at)
  //   throw Error.BadRequest('Microsoft-Credential is deleted!')

  if (!credential.scope.includes(SCOPE_OUTLOOK_READ))
    throw Error.BadRequest('Access is denied! Insufficient permission.')

  const microsoft = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  return microsoft
}



const test = async (req, res) => {
  const cid = '1725cd25-0ab5-40fd-915a-b1132042ebe6'

  const microsoftCredential = await MicrosoftCredential.get(cid)
  const microsoft = await getMicrosoftClient(microsoftCredential)

  const data = {
    microsoftCredential
  }


  const result = await subscriptionWorker.messages.handleSubscriptions(microsoft, data)

  return res.json(result || {})
}

module.exports = {
  test
}