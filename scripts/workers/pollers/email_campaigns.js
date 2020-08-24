const EmailCampaign = require('../../../lib/models/Email/campaign/due')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: EmailCampaign.sendDue,
  name: 'EmailCampaign.sendDue'
})
