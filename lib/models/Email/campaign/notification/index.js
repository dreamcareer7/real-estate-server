const promisify = require('../../../../utils/promisify')
const redis     = require('../../../../data-service/redis').createClient()

const { sendNotification } = require('./worker')

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem          = promisify(redis.zrem.bind(redis))

const { open_debounce_key: debounce_key } = require('./constants')


const sentNotifications = async () => {
  const until = Math.round(Date.now() / 1000)

  const records  = await zrangebyscore(debounce_key, 0, until)

  if ( records.length < 1 ) {
    return
  }

  const promises = []

  /*
    record: {
      origin,
      event,
      email_id
    }
  */

  for (const record of records) {
    const obj = JSON.parse(record)

    promises.push(sendNotification(obj.origin, obj.event, obj.email_id))
    promises.push(zrem(debounce_key, record))
  }

  await Promise.all(promises)
}


module.exports = {
  sentNotifications
}