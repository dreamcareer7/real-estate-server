const db = require('../../../utils/db')
const sq = require('../../../utils/squel_extensions')
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
 * @param {object} opts
 * @param {IBrand['id']?=} [opts.brand]
 * @param {number?=} [opts.limit]
 * @param {number?=} [opts.start]
 * @param {boolean?=} [opts.due]
 * @param {boolean?=} [opts.executed]
 * @param {(string[] | string)?=} [opts.order]
 */
function createFilterQuery ({
  brand = null,
  limit = 250,
  start = 0,
  due = true,
  executed = null,
  order = null,
}) {
  const q = sq.select()
    .from('email_campaigns', 'ec')
    .field('ec.id')
    .field('COUNT(*) OVER()::int', 'total')
    .where('ec.deleted_at IS NULL')

  if (brand) {
    q.where('ec.brand = ?::uuid', brand)
  }
  if (typeof due === 'boolean') {
    q.where('ec.due_at IS ' + (due ? 'NOT NULL' : 'NULL'))
  }
  if (typeof executed === 'boolean') {
    q.where('ec.executed_at IS ' + (executed ? 'NOT NULL' : 'NULL'))
  }
  if (Number.isSafeInteger(limit) && (limit ?? 0) > 0) {
    q.limit(limit ?? 0)
  }
  if (Number.isSafeInteger(start) && (start ?? 0) > 0) {
    q.offset(start ?? 0)
  }
  if (order?.length && (Array.isArray(order) || typeof order === 'string')) {
    // @ts-expect-error-next-line
    q.signedOrder({
      on: [
        'created_at', 'updated_at', 'deleted_at',
        'due_at', 'executed_at', 'recipients_count',
      ],
      by: order,
      mapper: (/** @type {string} */col) => `ec.${col}`,
    })
  } else {
    q.order('created_at', false)
  }

  Object.assign(q, { name: 'email/campaign/filter' })

  return q
}

/**
 * @typedef {object} GetByBrandOptions
 * @property {('executed' | 'scheduled' | 'draft' | 'any')?=} [status]
 * @property {PaginationOptions['limit']?=} [limit]
 * @property {PaginationOptions['start']?=} [start]
 * @property {(PaginationOptions['order'] | string[])?=} [order]
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
  order = null
} = {}) => {
  /** @type {boolean?} */
  let due
  /** @type {boolean?} */
  let executed

  switch (status) {
    case 'executed':
      due = executed = true
      break
    case 'scheduled':
      due = true
      executed = false
      break
    case 'draft':
      due = executed = false
      break
    case 'any':
      due = executed = null
      break
    default:
      if (status) {
        throw Error.Validation(`Invalid status option: ${status}`)
      } else {
        due = true
        executed = null
      }
  }

  const q = createFilterQuery({
    brand,
    due,
    executed,
    limit,
    start,
    order,
  })

  const idRows = await db.select(q)
  if (!idRows.length) { return [] }

  const campaigns = await getAll(idRows.map(r => r.id))
  if (!campaigns.length) { return [] }

  // @ts-expect-error-next-line
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
