const EmailCampaign = require('../../../lib/models/Email/campaign/notification')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: EmailCampaign.sendNotifications,
  name: 'EmailCampaign.sendNotifications',
  wait: 5000
})
