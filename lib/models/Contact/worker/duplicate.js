const db = require('../../../utils/db')
const expect = require('../../../utils/validator').expect

const Contact = require('../index')

async function merge(job) {
  /** @type {IContactDuplicateClusterInput[]} */
  const clusters = job.data.clusters
  expect(clusters).to.be.an('array')

  for (const cl of clusters) {
    await Contact.merge(job.data.user_id, job.data.brand_id, cl.sub_contacts, cl.parent)
  }
}

async function add_vertices(job) {
  await db.query.promise('contact/duplicate/add', [
    job.data.brand_id,
    job.data.contact_ids
  ])
}

async function update_edges(job) {
  await db.query.promise('contact/duplicate/update', [
    job.data.brand_id,
    job.data.contact_ids
  ])
}

async function remove_vertices(job) {
  await db.query.promise('contact/duplicate/remove', [
    job.data.contact_ids
  ])
}

module.exports = {
  merge,
  add_vertices,
  update_edges,
  remove_vertices
}