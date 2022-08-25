#!/usr/bin/env node
const { setTimeout } = require('timers/promises')

const { runInContext } = require('../../lib/models/Context/util')
const sql = require('../../lib/utils/sql')

const TOTAL_DELETED_CRM_TASKS_COUNT = 8_153_489

async function main() {
  for (let offset = 1_000_000; offset < TOTAL_DELETED_CRM_TASKS_COUNT; offset += 200_000) {
    await runInContext(`delete-crm-associations-${new Date().toLocaleTimeString('en-us')}`, async () => {
      const query = `delete from crm_associations where crm_task = ANY(select id from crm_tasks where deleted_at < now() - interval '3 months' offset ${offset} limit 200000);`
      console.log(query)
      const deleted_records = await sql.update(query)
      console.log(`DELETE ${deleted_records}\n`)
    }, undefined, { exitAfterFinish: false })

    await setTimeout(1000)
  }
}

main().catch(ex => console.error(ex))
.finally(() => {
  process.exit()
})
