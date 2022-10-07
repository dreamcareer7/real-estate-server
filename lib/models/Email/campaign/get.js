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
 * @typedef {object} GetByBrandOptions
 * @property {('executed' | 'scheduled' | 'draft' | 'any')?=} [status]
 * @property {PaginationOptions['limit']?=} [limit]
 * @property {PaginationOptions['start']?=} [start]
 */
/**
 * @param {UUID} brand
 * @param {GetByBrandOptions=} [options]
 */
const getByBrand = async (brand, {
  status = null,
  limit = 250,
  start = 0,
} = {}) => {
  const [havingDueAt, havingExecutedAt] = (() => {
    // By default, select scheduled and executed campaigns
    if (!status) { return [true, null] }

    if (status === 'executed') { return [true, true] }
    if (status === 'scheduled') { return [true, false] }
    if (status === 'draft') { return [false, false] }
    if (status === 'any') { return [null, null] }

    throw Error.Validation(`Invalid status option: ${status}`)
  })()

  const ids = await db.selectIds('email/campaign/by_brand', [
    brand,
    havingDueAt,
    havingExecutedAt,
    limit,
    start,
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
