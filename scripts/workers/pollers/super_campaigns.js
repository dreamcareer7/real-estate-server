const SuperCampaign = require('../../../lib/models/Email/super_campaign/due')
const { poll } = require('../utils/poll')

function start () {
  poll({
    fn: SuperCampaign.executeDue,
    name: 'SuperCampaign.executeDue',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown,
}
