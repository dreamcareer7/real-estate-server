const db  = require('../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<IEmailCampaign[]>}
 */
const getAll = async ids => {
  return db.select('email/super_campaign/get', [ids])
}

/**
 * @param {UUID} id
 * @returns {Promise<IEmailCampaign>}
 */
const get = async id => {
  const campaigns = await getAll([id])

  if (campaigns.length < 1)
    throw Error.ResourceNotFound(`Super Campaign ${id} not found`)

  return campaigns[0]
}


/**
 * @param {UUID} brand
 */
async function getByBrand(brand, { start }) {
  const ids = await db.selectIds('email/super_campaign/by_brand', [brand, start])

  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByBrand
}
