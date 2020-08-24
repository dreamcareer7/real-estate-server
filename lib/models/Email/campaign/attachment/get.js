const db  = require('../../../../utils/db')

const getAll = async ids => {
  return db.select('email/campaign/attachments/get', [ids])
}

const getByCampaign = async campaignId => {
  const ids = await db.selectIds('email/campaign/attachments/get_by_campaing', [campaignId])

  return getAll(ids)
}

module.exports = {
  getAll,
  getByCampaign
}
