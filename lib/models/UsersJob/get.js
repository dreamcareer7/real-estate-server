const db = require('../../utils/db.js')
const sq = require('../../utils/squel_extensions')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('users_job/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const calendars = await getAll([id])

  if (calendars.length < 1) {
    throw Error.ResourceNotFound(`UsersJob by id ${id} not found.`)
  }

  return calendars[0]
}

/**
 * @param {Object} filter
 * @param {UUID?} filter.gcid google credential id
 * @param {UUID?} filter.mcid microsoft credential id
 * @param {String} filter.jobName
 * @param {Object} filter.metadata
 * @param {Object} filter.metadata.contact_address contact email address
 */
const find = async ({ gcid, mcid, jobName, metadata }) => {
  const query = sq.select()
    .field('*')
    .from('users_jobs')

  if (gcid) {
    query.where('google_credential = ?', gcid)
  }

  if (mcid) {
    query.where('microsoft_credential = ?', mcid)
  }

  if (jobName) {
    query.where('job_name = ?', jobName)
  }

  if (metadata?.contact_address) {
    query.where('metadata->>\'contact_address\' = ?', metadata.contact_address)
  }

  const result = await db.selectOne(query, [])

  return result
}


module.exports = {
  getAll,
  get,
  find
}