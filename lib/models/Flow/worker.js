const sql = require('../../utils/sql')
const { peanar } = require('../../utils/peanar')

const { scheduleSteps } = require('./step/schedule')
const Flow = {
  ...require('./filter'),
  ...require('./stop'),
}

async function stop_flow_for_contacts({ user, contacts }) {
  const res = await sql.select('SELECT brand, array_agg(id) AS ids FROM contacts WHERE id = ANY($1::uuid[]) GROUP BY brand', [contacts])

  for (const { brand, ids } of res) {
    const flows = await Flow.filter({ brand, contacts: ids, status: 'Active' })

    for (const flow of flows) {
      await Flow.stop(user, flow)
    }
  }
}

module.exports = {
  stop_flow_for_contacts: peanar.job({
    handler: stop_flow_for_contacts,
    name: 'stop_flow_for_contacts',
    queue: 'flows',
    exchange: 'flows',
    error_exchange: 'flows.error',
    retry_exchange: 'flows.retry'
  }),
  scheduleSteps: peanar.job({
    handler: scheduleSteps,
    name: 'scheduleSteps',
    queue: 'flows',
    exchange: 'flows',
    error_exchange: 'flows.error',
    retry_exchange: 'flows.retry',
  }),
}
