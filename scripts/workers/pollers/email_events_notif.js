const EmailCampaign = require('../../../lib/models/Email/campaign/notification')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: EmailCampaign.sentNotifications,
  name: 'EmailCampaign.sentNotifications',
  wait: 5000
})