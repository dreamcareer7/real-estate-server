const EmailCampaignStats = require('../../../lib/models/Email/campaign/stats')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: EmailCampaignStats.updateStats,
  name: 'EmailCampaignStats.updateStats'
})
