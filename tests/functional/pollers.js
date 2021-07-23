const EmailCampaign = require('../../lib/models/Email/campaign/due')

const pollers = {
  'EmailCampaign.sendDue': EmailCampaign.sendDue
}

module.exports = pollers
