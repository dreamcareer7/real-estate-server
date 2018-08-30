const _ = require('lodash')
const db = require('../../../utils/db')
const { aggregate } = require('../../../utils/worker')
const ListMember = require('../../Contact/list_members')
const Context = require('../../Context')

async function update_next_touch(job) {
  const contacts = job.data.contacts
  
  await db.update('crm/touch/update_next_touch', [contacts])
}

async function update_next_touch_for_list_members(job) {
  const list_id = job.data.list_id
  const membership_records = await ListMember.findByListId(list_id)
  const contacts = _.uniq(membership_records.map(mr => mr.contact))

  Context.log(contacts)
  await update_next_touch({
    data: { contacts }
  })
}

module.exports = aggregate({
  update_next_touch,
  update_next_touch_for_list_members
})