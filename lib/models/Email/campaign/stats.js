const config = require('../../../config')
const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')
const redis = require('../../../data-service/redis').createClient()
const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zadd = promisify(redis.zadd.bind(redis))
const zrem = promisify(redis.zrem.bind(redis))

const REDIS_KEY = 'email-campaign-updates'

EmailCampaign.touch = async campaign_id => {
  return zadd(REDIS_KEY, Date.now(), campaign_id)
}

EmailCampaign.updateStats = async (delay = config.email.stat_update_delay) => {
  const until = Date.now() + delay

  const ids = await zrangebyscore(REDIS_KEY, 0, until)

  if (ids.length < 1)
    return

  for(const id of ids)
    await rebuildCampaignStats(id)
}

const rebuildCampaignStats = async id => {
  console.log('Updating campaign stats', id)
  await db.query('email/campaign/update-stats', [id])
  await zrem(REDIS_KEY, id)
}
