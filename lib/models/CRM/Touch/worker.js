const _ = require('lodash')
const db = require('../../../utils/db')
const sql = require('../../../utils/sql')
const { peanar } = require('../../../utils/peanar')

const Context = require('../../Context')
const CrmAssociation = require('../Association')
const ListMember = require('../../Contact/list_members')
const Socket = require('../../Socket')

/**
 * Main data manipulation function
 * @param {{ contacts: UUID[]; brand: UUID; }} job 
 */
async function update_touch_times_for_contacts({ contacts, brand }) {
  await db.selectIds('crm/touch/update_touch_times_for_contacts', [
    contacts
  ])

  Socket.send(
    'contact:touch',
    brand,
    [{ contacts }],

    err => {
      if (err) Context.error('>>> (Socket) Error sending contact:touch socket event.', err)
    }
  )
}

async function update_touch_times_for_task({ task_id }) {
  const { brand } = await sql.select(
    'SELECT brand FROM crm_tasks WHERE id = $1::uuid',
    [ task_id ]
  )

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

  return update_touch_times_for_contacts({ contacts, brand })
}

async function update_touch_times_for_contact_associations_per_user(user_id, ids) {
  const original_user = Context.get('user')
  Context.set({ user: { id: user_id } })
  const associations = await CrmAssociation.getAll(ids)
  Context.set({ user: original_user })

  const groups = _.groupBy(associations, 'brand')

  for (const brand in groups) {
    const contacts = groups[brand].filter(a => a.contact && a.crm_task).map(a => a.contact)
    await update_touch_times_for_contacts({ contacts, brand })
  }
}

async function update_touch_times_for_contact_associations({ associations }) {
  const by_user = _.groupBy(associations, 'created_by')

  for (const user in by_user) {
    await update_touch_times_for_contact_associations_per_user(user, by_user[user].map(a => a.id))
  }
}

async function update_next_touch_for_list_members({ list_id }) {
  const membership_records = await ListMember.findByListId(list_id)
  const contacts = _.uniq(membership_records.map(mr => mr.contact))

  const { brand } = await sql.select(
    'SELECT brand FROM crm_lists WHERE id = $1::uuid',
    [ list_id ]
  )

  await update_touch_times_for_contacts({ contacts, brand })
}

module.exports = {
  update_touch_times_for_task: peanar.job(update_touch_times_for_task, {
    name: 'update_touch_times_for_task',
    queue: 'touches',
    exchange: 'touches',
    error_exchange: 'touches.error'
  }),

  update_touch_times_for_contacts: peanar.job(update_touch_times_for_contacts, {
    name: 'update_touch_times_for_contacts',
    queue: 'touches',
    exchange: 'touches',
    error_exchange: 'touches.error'
  }),
  update_touch_times_for_contact_associations: peanar.job(update_touch_times_for_contact_associations, {
    name: 'update_touch_times_for_contact_associations',
    queue: 'touches',
    exchange: 'touches',
    error_exchange: 'touches.error'
  }),
  update_next_touch_for_list_members: peanar.job(update_next_touch_for_list_members, {
    name: 'update_next_touch_for_list_members',
    queue: 'touches',
    exchange: 'touches',
    error_exchange: 'touches.error'
  }),
}
