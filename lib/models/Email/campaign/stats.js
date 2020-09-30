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
const zadd = promisify(redis.zadd.bind(redis))
const zrem = promisify(redis.zrem.bind(redis))

const { handleNotifications } = require('./notification/notifications')
const { email_events } = require('./notification/constants')

const REDIS_KEY = 'email-campaign-updates'


const rebuildCampaignStats = async member => {
  const obj = JSON.parse(member)

  Context.log('Rebuilding stats for campaign', obj.campaign_id)
  const { rows } = await db.query.promise('email/campaign/update-stats', [obj.campaign_id])

  await zrem(REDIS_KEY, member)

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

  const members = await zrangebyscore(REDIS_KEY, 0, until)

  if (members.length < 1) {
    return
  }

  for(const member of members) {
    const obj = JSON.parse(member)

    await rebuildCampaignStats(member)

    if ( obj.event === email_events.clicked ) {

      const origin = ''
      const origin = ''
      const origin = ''
      

      await handleNotifications({  }, obj.event)
    }
  }
}

const touch = async (campaign_id, event) => {
  Context.log('Touching campaign', campaign_id, event)

  return zadd(REDIS_KEY, Date.now(), JSON.stringify({ campaign_id, event }))
}


module.exports = {
  touch,
  updateStats,
}
