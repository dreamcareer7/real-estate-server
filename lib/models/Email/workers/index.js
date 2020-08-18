const promisify = require('../../../utils/promisify')
const redis     = require('../../../data-service/redis').createClient()

const { sendNotification } = require('./notification')

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem          = promisify(redis.zrem.bind(redis))

const CLICK_DEBOUNCE_KEY  = 'emails_event_debouncer_click'
const OPEN_DEBOUNCE_KEY   = 'emails_event_debouncer_open'


const parseNotifications = async () => {
  const until = Math.round(Date.now() / 1000)

  const openRecords  = await zrangebyscore(OPEN_DEBOUNCE_KEY, 0, until)
  const ClickRecords = await zrangebyscore(CLICK_DEBOUNCE_KEY, 0, until)

  if ( openRecords.length < 1 && ClickRecords.length < 1 ) {
    return
  }

  const notifPromises = []
  const redisPromises = []

  for (const key of openRecords) {
    notifPromises.push(sendNotification(key, 'opened'))
    redisPromises.push(zrem(OPEN_DEBOUNCE_KEY, key))
  }

  for (const key of ClickRecords) {
    notifPromises.push(sendNotification(key, 'clicked'))
    redisPromises.push(zrem(OPEN_DEBOUNCE_KEY, key))
  }

  await Promise.all(notifPromises)
  await Promise.all(redisPromises)

  return
}


module.exports= {
  parseNotifications
}