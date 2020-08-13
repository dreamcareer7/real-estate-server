const db     = require('../../../utils/db')

const { getAll } = require('./get')
const { send } = require('./send')

const sendDue = async () => {
  const due = await db.selectIds('email/campaign/due')

  const campaigns = await getAll(due)

  for(const campaign of campaigns)
    await send(campaign)
}

module.exports = {
  sendDue,
}
