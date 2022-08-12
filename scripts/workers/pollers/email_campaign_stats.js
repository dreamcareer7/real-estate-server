const EmailCampaignStats = require('../../../lib/models/Email/campaign/stats')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: EmailCampaignStats.updateStats,
    name: 'EmailCampaignStats.updateStats',
    wait: 30000
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
