const db = require('../../../utils/db')
const { aggregate } = require('../../../utils/worker')

async function update_next_touch(job) {
  const contacts = job.data.contacts

  await db.update('crm/touch/update_next_touch', [contacts])
}

module.exports = aggregate({
  update_next_touch
})