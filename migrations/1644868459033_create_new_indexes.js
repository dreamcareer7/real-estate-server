const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX IF NOT EXISTS "crm_tasks_brand" ON "public"."crm_tasks" USING btree ("brand" "pg_catalog"."uuid_ops" ASC NULLS LAST)',
  'CREATE INDEX IF NOT EXISTS "contacts_next_touch_not_deleted_idx" ON "public"."contacts" USING btree ("next_touch" "pg_catalog"."timestamptz_ops" ASC NULLS LAST  ) WHERE deleted_at IS NULL',
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
