const promisify = require('../../utils/promisify')
const redis     = require('../../data-service/redis').createClient()
const zadd      = promisify(redis.zadd.bind(redis))

const WEBHOOK_PROCESS_DELAY = 25
const MAILBOX_KEY = 'outlook_mailbox_debouncer'


const outlook = async (key) => {
  const score = Math.round(Date.now() / 1000) + WEBHOOK_PROCESS_DELAY
  await zadd(MAILBOX_KEY, score, key)
}


module.exports = {
  outlook
}