const EmailCampaign = require('../../../lib/models/Email/campaign/due')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: EmailCampaign.sendDue,
    name: 'EmailCampaign.sendDue',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
