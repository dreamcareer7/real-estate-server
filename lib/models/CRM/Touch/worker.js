const _ = require('lodash')
const db = require('../../../utils/db')
const sql = require('../../../utils/sql')
const { aggregate } = require('../../../utils/worker')

const Context = require('../../Context')
const CrmAssociation = require('../Association')
const Contact = require('../../Contact')
const ListMember = require('../../Contact/list_members')
const Socket = require('../../Socket')

/**
 * Main data manipulation function
 * @param {{data: { contacts: UUID[]; brand: UUID; }}} job 
 */
async function update_touch_times_for_contacts(job) {
  Context.log(job.data)
  const contacts = job.data.contacts
  const brand = job.data.brand

  await db.selectIds('crm/touch/update_touch_times_for_contacts', [
    contacts
  ])

  if (!brand) {
    /** @type {{ brand: UUID; contacts: UUID[] }[]} */
    const contact_brands = await sql.select(`
      SELECT
        brand, array_agg(id) AS contacts
      FROM
        contacts
      WHERE
        id = ANY($1::uuid[])
      GROUP BY
        brand
    `, [contacts])
  
    for (const item of contact_brands) {
      Socket.send(
        'contact:touch',
        item.brand,
        [{ contacts: item.contacts }],
    
        err => {
          if (err) Context.error('>>> (Socket) Error sending contact:touch socket event.', err)
        }
      )
    }
  } else {
    Socket.send(
      'contact:touch',
      brand,
      [{ contacts }],
  
      err => {
        if (err) Context.error('>>> (Socket) Error sending contact:touch socket event.', err)
      }
    )
  }
}

async function update_touch_times_for_task(job) {
  const task_id = job.data.task_id
  const brand = job.data.brand

  const contacts = await sql.selectIds(`
    SELECT DISTINCT
      contact AS id
    FROM
      crm_associations
    WHERE
      deleted_at IS NULL
      AND association_type = 'contact'
      AND crm_task = $1::uuid
  `, [
    task_id
  ])

  return update_touch_times_for_contacts({ data: { contacts, brand }})
}

async function update_touch_times_for_contact_associations_per_user(user_id, ids) {
  const original_user = Context.get('user')
  Context.set({ user: { id: user_id } })
  const associations = await CrmAssociation.getAll(ids)
  Context.set({ user: original_user })

  const groups = _.groupBy(associations, 'brand')

  for (const brand in groups) {
    const contacts = groups[brand].filter(a => a.contact && a.crm_task).map(a => a.contact)
    await update_touch_times_for_contacts({ data: { contacts, brand }})
  }
}

async function update_touch_times_for_contact_associations(job) {
  const by_user = _.groupBy(job.data.associations, 'created_by')

  for (const user in by_user) {
    await update_touch_times_for_contact_associations_per_user(user, by_user[user].map(a => a.id))
  }
}

async function update_next_touch_for_list_members(job) {
  const list_id = job.data.list_id
  const membership_records = await ListMember.findByListId(list_id)
  const contacts = _.uniq(membership_records.map(mr => mr.contact))

  const { brand } = await sql.selectOne(
    'SELECT brand FROM crm_lists WHERE id = $1::uuid',
    [ list_id ]
  )

  await update_touch_times_for_contacts({
    data: { contacts, brand }
  })
}

async function update_touch_times_for_tag(job) {
  const { tag, brand } = job.data

  const { ids } = await Contact.fastFilter(brand, [{
    attribute_type: 'tag',
    value: tag
  }], {})

  await update_touch_times_for_contacts({ data: { contacts: ids, brand } })
}

module.exports = aggregate({
  update_touch_times_for_task,
  update_touch_times_for_contacts,
  update_touch_times_for_contact_associations,
  update_next_touch_for_list_members,
  update_touch_times_for_tag
})
