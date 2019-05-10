const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE IF NOT EXISTS showings_credentials (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent uuid NOT NULL REFERENCES agents(id),

    username text NOT NULL,
    password text NOT NULL,

    last_crawled_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,
  
    UNIQUE (agent)
  )`,

  `CREATE TABLE IF NOT EXISTS showings (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent uuid NOT NULL REFERENCES agents(id),

    mls_number text NOT NULL,
    mls_title text NOT NULL,

    showing_start_date timestamptz,
    showing_end_date timestamptz,

    remote_agent_id text NOT NULL,
    remote_agent_name text NOT NULL,
    remote_agent_email text NOT NULL,
    remote_agent_desc text NOT NULL,
    remote_agent_phone_office text NOT NULL,
    remote_agent_phone_cell text NOT NULL,

    result text NOT NULL,

    feedback_text text NOT NULL,
    feedback_id text NOT NULL,
    cancellation_reason text NOT NULL,
    note_text text NOT NULL,
    note_id text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
