const config    = require('../../config')
const promisify = require('../../utils/promisify')
const redis     = require('../../data-service/redis').createClient()
const zadd      = promisify(redis.zadd.bind(redis))


const WEBHOOK_PROCESS_DELAY = config.google_webhook_debouncer.process_delay
const MAILBOX_KEY  = config.google_webhook_debouncer.mailbox_redis_key
const CALENDAR_KEY = config.google_webhook_debouncer.calendar_redis_key


const gmail = async (key) => {
  const score = Math.round(Date.now() / 1000) + WEBHOOK_PROCESS_DELAY
  await zadd(MAILBOX_KEY, score, key)
}

const outlook = async (key) => {
  const score = Math.round(Date.now() / 1000) + WEBHOOK_PROCESS_DELAY
  await zadd(CALENDAR_KEY, score, key)
}


module.exports = {
  gmail,
  outlook
}