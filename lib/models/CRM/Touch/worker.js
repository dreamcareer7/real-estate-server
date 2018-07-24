const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')
const { combineHandlers } = require('../../../utils/worker')

const ListMember = require('../../Contact/list_members')

async function update_next_touch(job) {
  const contacts = job.data.contacts

  await db.update('crm/touch/update_next_touch', [contacts])
}

module.exports = combineHandlers({
  update_next_touch
})