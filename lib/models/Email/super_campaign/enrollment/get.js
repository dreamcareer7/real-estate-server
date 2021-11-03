const isBoolean = require('lodash/isBoolean')
const isString = require('lodash/isString')

const sq = require('../../../../utils/squel_extensions')
const db = require('../../../../utils/db')

/**
 * @typedef {import('../types').SuperCampaignEnrollmentFilterOptions} SuperCampaignEnrollmentFilterOptions
 * @typedef {import('../types').SuperCampaignEnrollment} SuperCampaignEnrollment
 * @typedef {import('../types').SuperCampaignStored} SuperCampaignStored
 */

/**
 * @param {UUID[]} ids
 * @returns {Promise<SuperCampaignEnrollment[]>}
 */
async function getAll(ids) {
  return db.select('email/super_campaign/enrollment/get', [ids])
}

/**
 * @param {UUID} id
 * @returns {Promise<SuperCampaignEnrollment | null>}
 */
async function get(id) {
  const res = await getAll([id])

  if (res.length > 0) {
    return res[0]
  }

  return null
}

/**
 * @typedef {SuperCampaignEnrollment & { total: number }} EnrollmentWithTotal
 * @param {SuperCampaignEnrollmentFilterOptions=} [opts={}]
 * @returns {Promise<[] | [EnrollmentWithTotal, ...SuperCampaignEnrollment[]]>}
 */
async function filter ({
  including_deleted = false,
  ...opts
} = {}) {
  const q = sq
    .select()
    .field('sce.id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('super_campaigns_enrollments', 'sce')

  if (including_deleted !== true) {
    q.where('sce.deleted_at IS NULL')
  }
  
  if (isString(opts.super_campaign)) {
    q.where('sce.super_campaign = ?::uuid', opts.super_campaign)
  }

  if (isString(opts.brand)) {
    q.where('sce.brand = ?::uuid', opts.brand)
  }

  if (isString(opts.user)) {
    q.where('sce."user" = ?::uuid', opts.user)
  }

  if (isBoolean(opts.detached)) {
    q.where('sce.detached = ?::boolean', opts.detached)
  }

  if (Array.isArray(opts.tags)) {
    const tags = sq.SqArray.from(opts.tags)
    q.where('sce.tags <@ ?::text[]', tags)
    q.where('sce.tags @> ?::text[]', tags)
  }

  if (isBoolean(opts.executed)) {
    q.join('super_campaigns', 'sc', 'sc.id = sce.super_campaign')
    q.where(`sc.executed_at IS ${opts.executed ? 'NOT' : ''} NULL`)
  }

  if (Number.isSafeInteger(opts.start)) {
    q.offset(opts.start ?? NaN)
  }

  if (Number.isSafeInteger(opts.limit)) {
    q.limit(opts.limit ?? NaN)
  }

  Object.assign(q, { name: 'email/super_campaign/enrollment/filter' })
  const rows = await db.select(q)
  if (!rows.length) { return [] }

  const ids = rows.map(r => r.id)
  const total = rows[0].total
  const enrollments = await getAll(ids)
  Object.assign(enrollments[0], { total })

  return /** @type {[]} */(enrollments)
}

module.exports = {
  getAll,
  get,
  filter,
}
