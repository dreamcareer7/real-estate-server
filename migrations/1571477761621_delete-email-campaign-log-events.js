const _ = require('lodash')
const sql = require('../lib/utils/sql')
const CrmTask = require('../lib/models/CRM/Task')
const createContext = require('../scripts/workers/utils/create-context')

const run = async () => {
  const { commit, run } = await createContext({
    id: 'migrations'
  })

  /** @type { {crm_task: UUID; created_by: UUID }[] } */

  await run(async () => {
    const rows = await sql.select(`
      SELECT
        a.crm_task,
        ct.created_by
      FROM
        crm_associations AS a
        JOIN email_campaigns AS ec
          ON a.email = ec.id
        JOIN crm_tasks AS ct
          ON a.crm_task = ct.id
      WHERE
        association_type = 'email'
        AND ec.deleted_at is null
        AND ec.executed_at is not null
    `)

    for (const chunk of _.chunk(rows, 20)) {
      await Promise.all(chunk.map(item => CrmTask.remove([item.crm_task], item.created_by)))
    }

    await commit()
  })
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
