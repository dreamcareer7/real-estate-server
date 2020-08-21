const db     = require('../../../utils/db')

const { sendCampaign } = require('./worker')

const sendDue = async () => {
  const due = await db.selectIds('email/campaign/due')

  for(const id of due)
    await sendCampaign(id)
}

module.exports = {
  sendDue,
}
