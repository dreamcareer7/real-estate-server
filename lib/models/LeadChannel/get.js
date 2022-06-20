const db = require('../../utils/db')
const { filter } = require('./filter')

/**
 * @param {UUID[]} ids
 * @typedef {import('./types').LeadChannel} LeadChannel
 * @returns {Promise<LeadChannel[]>}
 */
const getAll = async (ids) => {
  return db.select('lead_channel/get', [ids])
}

/**
 * @param {UUID} id
 * @returns {Promise<LeadChannel>}
 */
const get = async (id) => {
  const rows = await getAll([id])

  if (rows.length < 1) throw Error.ResourceNotFound(`Lead channel ${id} not found`)

  return rows[0]
}

/**
 * @param {UUID} brand
 * @typedef {import('./types').Filter} Filter
 * @param {Filter} options
 * @returns {Promise<LeadChannel[]>}
 */

const getByBrand = async (brand, options = {}) => {
  const result = await filter(brand, options)
  if (!result.total) {
    return []
  }

  const rows = await getAll(result.ids)
  // @ts-ignore
  rows[0].total = result.total
  return rows
}

module.exports = {
  get,
  getAll,
  getByBrand,
}
