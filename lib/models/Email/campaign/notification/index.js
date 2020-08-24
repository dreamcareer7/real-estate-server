const promisify = require('../../../../utils/promisify')
const redis     = require('../../../../data-service/redis').createClient()

const { sendNotification } = require('./worker')

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem          = promisify(redis.zrem.bind(redis))

const { OPEN_DEBOUNCE_KEY } = require('./constants')


const sentNotifications = async () => {
  const until = Math.round(Date.now() / 1000)

  const openRecords  = await zrangebyscore(OPEN_DEBOUNCE_KEY, 0, until)

  if ( openRecords.length < 1 ) {
    return
  }

  const notifPromises = []
  const redisPromises = []

  for (const key of openRecords) {
    notifPromises.push(sendNotification('opened', key))
    redisPromises.push(zrem(OPEN_DEBOUNCE_KEY, key))
  }

  await Promise.all(notifPromises)
  await Promise.all(redisPromises)

  return
}


module.exports = {
  sentNotifications
}