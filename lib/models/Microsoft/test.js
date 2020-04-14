const MicrosoftCredential = require('./credential')
// const MicrosoftCalendar   = require('./calendar')
// const subscriptionWorker  = require('./workers/subscriptions')

const { syncCalendar } = require('./workers/job_cal.js')
// const getClient = require('./client')



const test = async (req, res) => {
  let result = {}

  const microsoftCredential = await MicrosoftCredential.get('debcc087-fd59-4635-8fda-d65264ee82cf')
  // const microsoft = await getClient(microsoftCredential.id, 'calendar')
  
  // await microsoft.deleteSubscription('')
  // await microsoft.deleteSubscription('')

  // const toSync = [
  //   'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEGAADC2sKTjOSNTpsi5KIF1ip6AAAAABELAAA='
  // ]
  // const toStopSync = []
  // await MicrosoftCalendar.configureCalendars(microsoftCredential, { toSync, toStopSync })

  // result = await MicrosoftCalendar.getRemoteMicrosoftCalendars(microsoftCredential)

  await syncCalendar({ microsoftCredential })

  return res.json(result || {})
}

module.exports = {
  test
}