const debounce     = require('../../utils/debounce')
const GoogleWorker = require('./workers')

const BOUNCE_DELAY = 5000

const handleGmailWebhook = async (key) => {
  // @ts-ignore
  await GoogleWorker.Gmail.pushEvent.immediate({ key })
}

const handleCalendarWebhook = async (key, payload) => {
  // @ts-ignore
  await GoogleWorker.Calendar.pushEvent.immediate({ key, payload })
}


module.exports = {
  gmail: debounce(handleGmailWebhook, BOUNCE_DELAY),
  calendar: debounce(handleCalendarWebhook, BOUNCE_DELAY)
}