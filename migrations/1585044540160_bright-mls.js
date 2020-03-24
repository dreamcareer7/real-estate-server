const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'BRIGHT\'',

  'BEGIN',
  'ALTER TABLE mls_data ALTER COLUMN matrix_unique_id TYPE bigint USING matrix_unique_id::bigint',

  'DROP MATERIALIZED VIEW agents_phones',
  'DROP MATERIALIZED VIEW agents_emails',

  'ALTER TABLE listings ALTER COLUMN matrix_unique_id TYPE bigint USING matrix_unique_id::bigint',
  'ALTER TABLE listings_filters ALTER COLUMN matrix_unique_id TYPE bigint USING matrix_unique_id::bigint',
  'ALTER TABLE agents ALTER COLUMN matrix_unique_id TYPE bigint USING matrix_unique_id::bigint',
  'ALTER TABLE offices ALTER COLUMN matrix_unique_id TYPE bigint USING matrix_unique_id::bigint',
  'ALTER TABLE photos ALTER COLUMN listing_mui TYPE bigint USING listing_mui::bigint',

  `CREATE MATERIALIZED VIEW agents_phones AS (
    WITH stated_phones AS (
      SELECT
        ('phone_number_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        phone_number as phone,
        matrix_modified_dt as date
      FROM agents
      WHERE phone_number <> ''
    ),
  
    stated_work_phones AS (
      SELECT
        ('work_phone' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        work_phone as phone,
        matrix_modified_dt as date
      FROM agents
      WHERE work_phone <> ''
    ),
  
    list_agents AS (
      SELECT
        ('list_agents_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        list_agent_direct_work_phone as phone,
        list_date as date
      FROM listings
      WHERE
        list_agent_direct_work_phone <> ''
    ),
  
    co_list_agents AS (
      SELECT
        ('co_list_agents_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        co_list_agent_direct_work_phone as phone,
        list_date as date
      FROM listings
      WHERE
        co_list_agent_direct_work_phone <> ''
    ),
  
    selling_agents AS (
      SELECT
        ('selling_agents_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        selling_agent_direct_work_phone as phone,
        list_date as date
      FROM listings
      WHERE
        selling_agent_direct_work_phone <> ''
    ),
  
    co_selling_agents AS (
      SELECT
        ('co_selling_agents_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        co_selling_agent_direct_work_phone as phone,
        list_date as date
      FROM listings
      WHERE
        co_selling_agent_direct_work_phone <> ''
    )
  
    SELECT * FROM stated_phones
    UNION ALL
    SELECT * FROM stated_work_phones
    UNION ALL
    SELECT * FROM list_agents
    UNION ALL
    SELECT * FROM co_list_agents
    UNION ALL
    SELECT * FROM selling_agents
    UNION ALL
    SELECT * FROM co_selling_agents
  )`,

  `CREATE MATERIALIZED VIEW agents_emails AS (
    WITH stated_emails AS (
      SELECT
        ('email_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        email,
        matrix_modified_dt as date
      FROM agents
      WHERE email <> ''
    ),
  
    list_agents AS (
      SELECT
        ('list_agents_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        list_agent_email as email,
        list_date as date
      FROM listings
      WHERE
        list_agent_email <> ''
    ),
  
    co_list_agents AS (
      SELECT
        ('co_list_agents_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        co_list_agent_email as email,
        list_date as date
      FROM listings
      WHERE
        co_list_agent_email <> ''
    ),
  
    selling_agents AS (
      SELECT
        ('selling_agents_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        selling_agent_email as email,
        list_date as date
      FROM listings
      WHERE
        selling_agent_email <> ''
    ),
  
    co_selling_agents AS (
      SELECT
        ('co_selling_agents_' || matrix_unique_id || mls) as id,
        matrix_unique_id as mui,
        mls,
        co_selling_agent_email as email,
        list_date as date
      FROM listings
      WHERE
        co_selling_agent_email <> ''
    )
  
    SELECT * FROM stated_emails
    UNION ALL
    SELECT * FROM list_agents
    UNION ALL
    SELECT * FROM co_list_agents
    UNION ALL
    SELECT * FROM selling_agents
    UNION ALL
    SELECT * FROM co_selling_agents
  )`,

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
