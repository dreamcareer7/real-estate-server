const db  = require('../../../utils/db')
const Orm = require('../../Orm/context')

/**
 * @param {UUID[]} ids
 * @returns {Promise<IEmailCampaign[]>}
 */
const getAll = async ids => {
  const associations = Orm.getEnabledAssociations()
  const conditions = Orm.getAssociationConditions('email_campaign.emails')
  const { contact, limit } = conditions || { limit: 7000 }

  return db.select('email/campaign/get', [ids, associations, contact, limit])
}

/**
 * @param {UUID} id
 * @returns {Promise<IEmailCampaign>}
 */
const get = async id => {
  const campaigns = await getAll([id])

  if (campaigns.length < 1)
    throw Error.ResourceNotFound(`Email Campaign ${id} not found`)

  return campaigns[0]
}


/**
 * @param {UUID} brand
 * @param {(PaginationOptions & { havingDueAt?: boolean | null })} options
 */
const getByBrand = async (brand, { havingDueAt = true, limit = 500 } = {}) => {
  const ids = await db.selectIds('email/campaign/by_brand', [
    brand,
    havingDueAt,
    limit,
  ])
  if (!ids.length) { return [] }

  return getAll(ids)
}

const getByUser = async (user, from, to) => {
  const ids = await db.selectIds('email/campaign/by_user', [user, from, to])

  return getAll(ids)
}


module.exports = {
  get,
  getAll,
  getByBrand,
  getByUser
}
