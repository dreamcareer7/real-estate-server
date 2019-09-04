const sql = require('../../utils/sql')
const { aggregate } = require('../../utils/worker')

const Flow = require('./index')

async function stop_flow_for_contacts(job) {
  const { user, contacts } = job.data

  const res = await sql.select('SELECT brand, array_agg(id) AS ids FROM contacts WHERE id = ANY($1::uuid[]) GROUP BY brand', [contacts])

  for (const { brand, ids } of res) {
    const flows = await Flow.filter({ brand, contacts: ids, status: 'Active' })

    for (const flow of flows) {
      await Flow.stop(user, flow)
    }
  }
}

module.exports = aggregate({
  stop_flow_for_contacts
})
