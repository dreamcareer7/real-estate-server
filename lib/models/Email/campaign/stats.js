const Context = require('../../Context')
const EmailCampaign = {
  ...require('../../Email/campaign/notify'),
  ...require('../../Email/campaign/constants'),
}
const config = require('../../../config')
const db = require('../../../utils/db')

const promisify = require('../../../utils/promisify')
const redis = require('../../../data-service/redis').createClient()
const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const exists = promisify(redis.exists.bind(redis))
const zadd   = promisify(redis.zadd.bind(redis))
const zrem   = promisify(redis.zrem.bind(redis))

const { handleCampaignOpenNotifications } = require('./notification/notifications')

const REDIS_KEY = 'email-campaign-updates'


const rebuildCampaignStats = async (campaign_id) => {
  Context.log('Rebuilding stats for campaign', campaign_id)
  const sec = parseInt(config.email.min_elapsed_sec_to_update_status)
  const { rows } = await db.query.promise('email/campaign/update-stats', [campaign_id, sec])

  await zrem(REDIS_KEY, campaign_id)

  const campaign = rows[0]
  EmailCampaign.notify(
    EmailCampaign.STATS_EVENT,
    campaign.created_by,
    campaign.brand,
    [campaign.ids],
    campaign
  )
}

const updateStats = async (delay = config.email.stat_update_delay) => {
  const until = Date.now() - delay

  const ids = await zrangebyscore(REDIS_KEY, 0, until)

  if (ids.length < 1) {
    return
  }

  // id: email_campaigns.id
  for (const id of ids) {
    await rebuildCampaignStats(id)

    const key = `opened_notifications_${id}`
    const status = await exists(key) // true if there is at least one open event.

    if (status) {
      await handleCampaignOpenNotifications(id)
    }
  }
}

const touch = async (campaign_id) => {
  Context.log('Touching campaign', campaign_id)

  return zadd(REDIS_KEY, Date.now(), campaign_id)
}


module.exports = {
  touch,
  updateStats,
}
