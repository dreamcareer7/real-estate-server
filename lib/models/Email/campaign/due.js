const db     = require('../../../utils/db')

const { sendCampaign } = require('./worker')

const getDue = () => {
  return db.selectIds('email/campaign/due')
}

const sendDue = async () => {
  const due = await getDue()

  for (const id of due)
    await sendCampaign(id)
}

module.exports = {
  getDue,
  sendDue,
}
