const _ = require('lodash')

const { expect } = require('../../utils/validator')

const { getCurrentBrand, _prepareQueryForFilters, limitAccess } = require('./common')

const Contact = require('../../models/Contact')
const ContactDuplicate = require('../../models/Contact/duplicate')
const Slack = require('../../models/Slack')
const Worker = require('../../models/Contact/worker/duplicate')

async function mergeAll(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  const clusters = await ContactDuplicate.findForBrand(brand_id)

  const job_id = await Worker.merge.immediate(
    /** @type {IContactDuplicateClusterInput[]} */
    (clusters.map(cl => ({
      parent: cl.contacts[0],
      sub_contacts: cl.contacts.slice(1)
    }))),
    user_id,
    brand_id
  )

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })    
}

async function ignoreAll(req, res) {
  const brand_id = getCurrentBrand()

  await ContactDuplicate.ignoreAll(brand_id)

  res.end()  
}

async function getDuplicateClusters(req, res) {
  /** @type {PaginationOptions} */
  const query = req.query
  _prepareQueryForFilters(query)

  const clusters = await ContactDuplicate.findForBrand(getCurrentBrand(), { ...query, limit: 100 })

  res.collection(clusters)
}

async function getContactDuplicateCluster(req, res) {
  const contact_id = req.params.id
  expect(contact_id).to.be.a.uuid

  const cluster = await ContactDuplicate.findForContact(getCurrentBrand(), contact_id)

  if (cluster) {
    return res.model(cluster)
  } 

  res.status(404)
  res.end()
}

async function merge(req, res) {
  const user_id = req.user.id
  const parent_id = req.params.id
  const sub_contacts = req.body.sub_contacts

  await limitAccess('write', user_id, getCurrentBrand(), sub_contacts.concat(parent_id))
  await Contact.merge(sub_contacts, parent_id, user_id, getCurrentBrand())

  Slack.send({
    channel: '6-support',
    text: `<mailto:${req.user.email}|${req.user.display_name}> manually merged ${sub_contacts.length + 1} contacts`,
    emoji: ':busts_in_silhouette:'
  })

  const parent = await Contact.get(parent_id)

  await res.model(parent)
}

async function bulkMerge(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  /** @type {IContactDuplicateClusterInput[]} */
  const clusters = req.body.clusters
  expect(clusters).to.be.an('array')

  const contact_ids = clusters.reduce(/** @param {UUID[]} ids */(ids, cl) => {
    return ids.concat(cl.parent).concat(cl.sub_contacts)
  }, [])

  const counts = _.countBy(contact_ids)
  for (const id in counts) {
    if (counts[id] > 1) {
      throw Error.Validation(`Contact ${id} appears in more than one cluster.`)
    }
  }

  await limitAccess('write', user_id, brand_id, contact_ids)

  const job_id = await Worker.merge.immediate(
    clusters,
    user_id,
    brand_id
  )

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

async function ignoreCluster(req, res) {
  const brand_id = getCurrentBrand()
  const cluster_id = parseInt(req.params.id)

  await ContactDuplicate.ignoreCluster(brand_id, cluster_id)

  res.end()
}

async function ignoreContactFromCluster(req, res) {
  const brand_id = getCurrentBrand()
  const cluster_id = parseInt(req.params.id)
  const contact_id = req.params.contact

  expect(contact_id).to.be.uuid

  await ContactDuplicate.ignoreContactFromCluster(brand_id, cluster_id, contact_id)

  res.end()
}

module.exports = {
  mergeAll,
  bulkMerge,
  getDuplicateClusters,
  ignoreAll,
  ignoreCluster,
  ignoreContactFromCluster,
  getContactDuplicateCluster,
  merge
}
