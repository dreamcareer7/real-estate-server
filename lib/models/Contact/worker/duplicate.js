const format = require('util').format
const _ = require('lodash')

const Context = require('../../Context')

const db = require('../../../utils/db')
const sql = require('../../../utils/sql')
const expect = require('../../../utils/validator').expect
const { peanar } = require('../../../utils/peanar')

const Contact = require('../manipulate')
const Slack = require('../../Slack')
const User = require('../../User/get')

const { sendFailureSocketEvent, sendSuccessSocketEvent } = require('./socket')

const SOCKET_EVENT = 'contact:import'

/**
 * @param {IContactDuplicateClusterInput[]} clusters
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @this {import('peanar/dist/job').default}
 */
async function merge(clusters, user_id, brand_id) {
  expect(clusters).to.be.an('array')

  try {
    for (const cl of clusters) {
      await Contact.merge(cl.sub_contacts, cl.parent, user_id, brand_id)
    }

    await sendSlackSupportMessage(user_id, clusters.length)
    sendSuccessSocketEvent(SOCKET_EVENT, this.id, user_id)
  } catch (ex) {
    sendFailureSocketEvent(SOCKET_EVENT, this.id, user_id, ex)
  }
}

/**
 * @param {UUID} brand_id
 * @param {UUID[]} contact_ids
 */
async function add_vertices(brand_id, contact_ids) {
  Context.set({ 'db:log': true })
  Context.log(`add_vertices for ${contact_ids?.length} contacts in brand ${brand_id}`)
  if (contact_ids?.length < 500) {
    await db.timed('contact/duplicate/add', [brand_id, contact_ids], 30000)
  } else {
    await db.timed('contact/duplicate/update_duplicate_pairs_for_brand', [ brand_id ], 30000)
    await db.timed('contact/duplicate/update_duplicate_clusters_for_brand', [ brand_id ], 30000)
  }
}

/**
 * @param {UUID} brand_id
 * @param {UUID[]} contact_ids
 */
async function update_edges(brand_id, contact_ids) {
  if (!brand_id || !contact_ids?.length) {
    return
  }

  Context.log(`update_edges for ${contact_ids?.length} contacts in brand ${brand_id}`)
  await db.timed('contact/duplicate/update', [brand_id, contact_ids], 30000)
}

/**
 * @param {UUID[]} contact_ids
 */
async function remove_vertices(contact_ids) {
  Context.log(`remove_vertices on ${contact_ids?.length} contacts`)
  Context.set({ 'db:log': true })

  if (contact_ids?.length >= 500) {
    const { brand } = await sql.selectOne('SELECT brand FROM contacts WHERE id = $1', [ contact_ids[0] ])
    await db.timed('contact/duplicate/remove/remove_pairs_for_brand', [ brand ], 30000)
    await db.timed('contact/duplicate/remove/remove_clusters_for_brand', [ brand ], 30000)
    await db.timed('contact/duplicate/update_duplicate_pairs_for_brand', [ brand ], 30000)
    await db.timed('contact/duplicate/update_duplicate_clusters_for_brand', [ brand ], 30000)
  } else {
    await db.timed('contact/duplicate/remove/remove_pairs_for_contacts', [contact_ids], 30000)
    const clusters = await db.map('contact/duplicate/remove/remove_clusters_for_contacts', [contact_ids], 'cluster')
    const affected_contacts = await db.map('contact/duplicate/remove/disband_clusters', [ _.uniq(clusters) ], 'contact')
    const affected_contacts_unique = _.uniq(affected_contacts)
    Context.log(`disbanded ${_.uniq(clusters)?.length} clusters, affecting ${affected_contacts_unique?.length} contacts`)
    await db.timed('contact/duplicate/update_duplicate_clusters_for_contacts', [ affected_contacts_unique ], 30000)
  }
}

/**
 * @param {UUID} user_id
 * @param {number} n_clusters
 */
async function sendSlackSupportMessage(user_id, n_clusters) {
  const user = await User.get(user_id)

  const text = format('<mailto:%s|%s> merged %d duplicate clusters', user.email, user.display_name, n_clusters)

  Slack.send({
    channel: '6-support',
    text: text,
    emoji: ':busts_in_silhouette:'
  })
}

function define_jobs(jobs) {
  return Object.entries(jobs).reduce((ex, [k, handler]) => {
    ex[k] = peanar.job({
      handler,
      name: `contact/duplicates/${k}`,

      exchange: 'contacts',
      queue: 'contact_duplicates',
      error_exchange: 'contact_duplicates.error',
      // retry_exchange: 'contact_duplicates.retry',
      // retry_delay: 30000,
      // max_retries: 5,
    })

    return ex
  }, {})
}

module.exports = define_jobs({
  merge,
  add_vertices,
  update_edges,
  remove_vertices
})
