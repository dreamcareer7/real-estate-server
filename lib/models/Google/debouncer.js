const promisify = require('../../utils/promisify')
const redis     = require('../../data-service/redis').createClient()
const zadd      = promisify(redis.zadd.bind(redis))


const WEBHOOK_PROCESS_DELAY = 25
const MAILBOX_KEY  = 'google_mailbox_debouncer'
const CALENDAR_KEY = 'google_calendar_debouncer'


const gmail = async (key) => {
  const score = Math.round(Date.now() / 1000) + WEBHOOK_PROCESS_DELAY
  await zadd(MAILBOX_KEY, score, key)
}

const calendar = async (key) => {
  const score = Math.round(Date.now() / 1000) + WEBHOOK_PROCESS_DELAY
  await zadd(CALENDAR_KEY, score, key)
}


module.exports = {
  gmail,
  calendar
}