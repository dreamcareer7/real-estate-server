const redis = require('../../data-service/redis').createClient()
const config = require('../../config')
const promisify = require('../../utils/promisify')

const { Listing } = require('../Listing')

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem = promisify(redis.zrem.bind(redis))
const del = promisify(redis.del.bind(redis))

const openhouseNotifKey = 'openhouse-notifications'

const openhouseWorker = async (delay = config.openhouses_notification_delay) => {
  const until = Date.now() - delay

  const listingIds = await zrangebyscore(openhouseNotifKey, 0, until)

  if (listingIds.length < 1) return

  for (const id of listingIds) {
    await zrem(openhouseNotifKey, id)
    await del(`${openhouseNotifKey}-${id}`)
    await Listing.notify.openHouse(id)
    await Listing.touch(id, 'OpenHouseAvailable')
  }
}


module.exports = {
  openhouseWorker,
}