// const _   = require('lodash')
// const Orm = require('./../Orm')
// const Context = require('../Context')
const config  = require('../../config')

const MicrosoftCredential = require('./credential')
const MicrosoftCalendar   = require('./calendar')
const subscriptionWorker  = require('./workers/subscriptions')
const getClient = require('./client')

const SCOPE_OUTLOOK_READ = config.microsoft_scopes.mail.read[0]



const test = async (req, res) => {
  let result = {}
  const cid = 'debcc087-fd59-4635-8fda-d65264ee82cf'

  const microsoftCredential = await MicrosoftCredential.get(cid)
  const microsoft = await getClient(microsoftCredential.id, 'calendar')
  
  // const data = { microsoftCredential }

  // await microsoft.deleteSubscription('')
  // await microsoft.deleteSubscription('')
  // await microsoft.deleteSubscription('')

  const toSync = ['AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEGAADC2sKTjOSNTpsi5KIF1ip6AAAAABELAAA=', 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEGAADC2sKTjOSNTpsi5KIF1ip6AAEph2NtAAA=']
  const toStopSync = []
  await MicrosoftCalendar.configureCalendars(microsoftCredential, { toSync, toStopSync })

  // result = await MicrosoftCalendar.getRemoteMicrosoftCalendars(microsoftCredential)

  // result = await MicrosoftCalendar.getRemoteMicrosoftCalendars(microsoftCredential)

  // result = await subscriptionWorker.messages.handleSubscriptions(microsoft, data)

  return res.json(result || {})
}

module.exports = {
  test
}