const Context         = require('../Context')
const debounce        = require('../../utils/debounce')
const MicrosoftWorker = require('./workers')

const BOUNCE_DELAY = 15000

const handleOutlookWebhook = async (key) => {
  // @ts-ignore
  await MicrosoftWorker.Outlook.pushEvent.immediate({ key })
}

const handleCalendarWebhook = async (key, payload) => {
  // @ts-ignore
  await MicrosoftWorker.Calendar.pushEvent.immediate({ key, payload })
}


module.exports = {
  outlook: debounce(handleOutlookWebhook, BOUNCE_DELAY),
  calendar: debounce(handleCalendarWebhook, BOUNCE_DELAY)
}