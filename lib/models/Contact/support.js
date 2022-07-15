const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')
const { contactFilterQuery } = require('./fast_filter')

/**
 * Generates the move query
 * @param {UUID} destBrand
 * @param {UUID} srcBrand
 * @param {UUID} srcUser
 * @param {IContactAttributeFilter[] | undefined} attributeFilters
 * @param {(IContactFilterOptions & PaginationOptions) | undefined} options
 */
async function moveQuery(destBrand, srcBrand, srcUser, attributeFilters, options) {
  const filterQ = await contactFilterQuery(srcBrand, srcUser, attributeFilters, options)
  return sq.update()
    .with('to_update', filterQ)
    .table('contacts', 'c')
    .set('brand', destBrand)
    .from('to_update')
    .where('c.id = to_update.id')
}

/**
 * Moves contacts to a destination brand
 * @param {UUID} destBrand
 * @param {UUID} srcBrand
 * @param {UUID} srcUser
 * @param {IContactAttributeFilter[] | undefined} attributeFilters
 * @param {(IContactFilterOptions & PaginationOptions) | undefined} options
 */
async function move(destBrand, srcBrand, srcUser, attributeFilters, options) {
  const q = await moveQuery(destBrand, srcBrand, srcUser, attributeFilters, options)

  // @ts-ignore
  q.name = 'contact/support/move'

  await db.update(q, [])
}

module.exports = {
  moveQuery,
  move
}
