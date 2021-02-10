const EmailCampaign = require('../../../lib/models/Email/campaign/notification')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: EmailCampaign.sendNotifications,
    name: 'EmailCampaign.sendNotifications',
    wait: 5000,
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
