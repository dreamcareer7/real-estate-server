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
 * The first element of results (if presents), includes `total` property.
 * @param {UUID} brand
 * @param {GetByBrandOptions=} [options]
 */
const getByBrand = async (brand, {
  status = null,
  limit = 250,
  start = 0,
} = {}) => {
  /** @type {boolean?} */
  let havingDueAt
  /** @type {boolean?} */
  let havingExecutedAt

  switch (status) {
    case 'executed':
      havingDueAt = havingExecutedAt = true
      break
    case 'scheduled':
      havingDueAt = true
      havingExecutedAt = false
      break
    case 'draft':
      havingDueAt = havingExecutedAt = false
      break
    case 'any':
      havingDueAt = havingExecutedAt = null
      break
    default:
      if (status) {
        throw Error.Validation(`Invalid status option: ${status}`)
      } else {
        havingDueAt = true
        havingExecutedAt = null
      }
  }

  const idRows = await db.select('email/campaign/by_brand', [
    brand,
    havingDueAt,
    havingExecutedAt,
    limit,
    start,
  ])
  if (!idRows.length) { return [] }

  const campaigns = await getAll(idRows.map(r => r.id))
  if (!campaigns.length) { return [] }

  // @ts-expect-error
  campaigns[0].total = idRows[0].total

  return campaigns
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
