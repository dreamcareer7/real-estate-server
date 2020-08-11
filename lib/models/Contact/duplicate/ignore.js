const db = require('../../../utils/db')
const { update_edges } = require('../worker/duplicate')

/**
 * @param {number} cluster
 * @param {UUID} contact
 */
async function ignoreContactFromCluster(brand_id, cluster, contact) {
  /** @type {UUID[]} */
  const remaining = await db.map('contact/duplicate/ignore', [
    contact,
    cluster,
    brand_id
  ], 'contact')

  // Queue update_edges job after db transaction commit. Don't await!
  update_edges(brand_id, [...remaining, contact])
}

/**
 * @param {UUID} brand_id
 * @param {number} cluster
 */
async function ignoreCluster(brand_id, cluster) {
  /** @type {{ a: UUID; b: UUID}[]} */
  const remaining = await db.select('contact/duplicate/ignore_cluster', [
    cluster,
    brand_id
  ])

  const contacts = remaining.flatMap(row => [row.a, row.b])

  // Queue update_edges job after db transaction commit. Don't await!
  update_edges(brand_id, contacts)
}

/**
 * @param {UUID} brand_id 
 */
async function ignoreAll(brand_id) {
  /** @type {{ a: UUID; b: UUID}[]} */
  const remaining = await db.select('contact/duplicate/ignore_all', [
    brand_id
  ])

  const contacts = remaining.flatMap(row => [row.a, row.b])

  // Queue update_edges job after db transaction commit. Don't await!
  update_edges(brand_id, contacts)
}

/**
 * Support function for when user wants duplicate recommendations back
 * @param {UUID} brand_id 
 * @param {Date} timestamp 
 */
async function unignore(brand_id, timestamp) {
  const contacts = await db.selectIds('contact/duplicate/ignored_after', [ brand_id, timestamp.toISOString() ])

  await db.update('contact/duplicate/unignore_after', [ brand_id, timestamp.toISOString() ])

  update_edges(brand_id, contacts)
}

module.exports = {
  ignoreContactFromCluster,
  ignoreCluster,
  ignoreAll,
  unignore,
}
