const _ = require('lodash')
const db = require('../../../utils/db')
const { aggregate } = require('../../../utils/worker')

const Context = require('../../Context')
const CrmAssociation = require('../Association')
const ListMember = require('../../Contact/list_members')

async function update_next_touch(job) {
  const contacts = job.data.contacts
  
  await db.update('crm/touch/update_next_touch', [contacts])
}

async function update_touch_times_for_task(job) {
  const task_id = job.data.task_id

  await db.selectIds('crm/touch/update_touch_times_for_task_associations', [
    task_id
  ])
}

async function update_touch_times_for_contacts(job) {
  const contacts = job.data.contacts

  await db.selectIds('crm/touch/update_touch_times_for_contacts', [
    contacts
  ])
}

async function update_touch_times_for_contact_associations_per_user(user_id, ids) {
  const original_user = Context.get('user')
  Context.set({ user: { id: user_id } })
  const associations = await CrmAssociation.getAll(ids)
  Context.set({ user: original_user })

  const contacts = associations.filter(a => a.contact && a.crm_task).map(a => a.contact)

  Context.log(contacts)

  return update_touch_times_for_contacts({ data: { contacts }})
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

  await update_next_touch({
    data: { contacts }
  })
}

module.exports = aggregate({
  update_touch_times_for_task,
  update_touch_times_for_contacts,
  update_touch_times_for_contact_associations,
  update_next_touch,
  update_next_touch_for_list_members
})
