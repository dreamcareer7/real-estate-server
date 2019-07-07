const db = require('../../../utils/db')
const expect = require('../../../utils/validator').expect
const { peanar } = require('../../../utils/peanar')

const Contact = require('../index')

async function merge(job) {
  /** @type {IContactDuplicateClusterInput[]} */
  const clusters = job.data.clusters
  expect(clusters).to.be.an('array')

  for (const cl of clusters) {
    await Contact.merge(cl.sub_contacts, cl.parent, job.data.user_id, job.data.brand_id)
  }
}

/**
 * @param {UUID} brand_id 
 * @param {UUID[]} contact_ids 
 */
async function add_vertices(brand_id, contact_ids) {
  await db.query.promise('contact/duplicate/add', [
    brand_id,
    contact_ids
  ])
}

/**
 * @param {UUID} brand_id 
 * @param {UUID[]} contact_ids 
 */
async function update_edges(brand_id, contact_ids) {
  await db.query.promise('contact/duplicate/update', [
    brand_id,
    contact_ids
  ])
}

/**
 * @param {UUID[]} contact_ids 
 */
async function remove_vertices(contact_ids) {
  await db.query.promise('contact/duplicate/remove', [
    contact_ids
  ])
}

module.exports = {
  merge,
  add_vertices: peanar.job(add_vertices, { exchange: 'contacts', queue: 'contact_duplicates' }),
  update_edges: peanar.job(update_edges, { exchange: 'contacts', queue: 'contact_duplicates' }),
  remove_vertices: peanar.job(remove_vertices, { exchange: 'contacts', queue: 'contact_duplicates' })
}
