const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE brands_events (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid REFERENCES users (id),
    deleted_by uuid REFERENCES users (id),
  
    brand uuid NOT NULL REFERENCES brands (id),
  
    title text NOT NULL,
    description text,
    task_type text NOT NULL,
    reminder interval
  )`,

  `CREATE TABLE brands_flows (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid REFERENCES users (id),
    deleted_by uuid REFERENCES users (id),
  
    brand uuid NOT NULL REFERENCES brands (id),
  
    name text NOT NULL,
    description text
  )`,

  `CREATE TABLE brands_flow_steps (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid REFERENCES users (id),
    deleted_by uuid REFERENCES users (id),
  
    title text NOT NULL,
    description text,
    due_in interval NOT NULL,
  
    flow uuid REFERENCES brands_flows (id),
    event uuid REFERENCES brands_events (id)
  )`,

  `CREATE TABLE flows (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid REFERENCES users (id),
    deleted_by uuid REFERENCES users (id),
  
    brand uuid NOT NULL REFERENCES brands (id),
    origin uuid NOT NULL REFERENCES brands_flows (id),
  
    name text NOT NULL,
    description text,
    starts_at date NOT NULL,
  
    contact uuid REFERENCES contacts (id)
  )`,

  `CREATE TABLE flows_events (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid REFERENCES users (id),
    deleted_by uuid REFERENCES users (id),
  
    origin uuid NOT NULL REFERENCES brands_events (id),
    crm_task uuid REFERENCES crm_tasks (id)
  )`,

  `CREATE TABLE flows_steps (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid REFERENCES users (id),
    deleted_by uuid REFERENCES users (id),
  
    flow uuid NOT NULL REFERENCES flows (id),
    origin uuid NOT NULL REFERENCES brands_flow_steps (id),
    event uuid REFERENCES flows_events (id)
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
