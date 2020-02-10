const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TYPE subscription_status AS ENUM(
    'future',
    'in_trial',
    'active',
    'non_renewing',
    'paused',
    'cancelled'
  )`,

  `CREATE TABLE brands_customers (
    id               uuid primary key NOT NULL DEFAULT uuid_generate_v4(),
    created_at       timestamp without time zone NOT NULL DEFAULT clock_timestamp(),
    updated_at       timestamp without time zone NOT NULL DEFAULT clock_timestamp(),
    deleted_at       timestamp without time zone,
    created_within   text NOT NULL,
    updated_within   text NOT NULL,
    deleted_within   text,
    brand            uuid NOT NULL UNIQUE REFERENCES brands(id),
   "user"           uuid NOT NULL UNIQUE REFERENCES users(id),
    chargebee_id     TEXT NOT NULL UNIQUE,
    chargebee_object JSONB NOT NULL
  )`,

  `CREATE TABLE brands_subscriptions (
    id           uuid primary key NOT NULL DEFAULT uuid_generate_v4(),
    created_at       timestamp without time zone NOT NULL DEFAULT clock_timestamp(),
    updated_at       timestamp without time zone NOT NULL DEFAULT clock_timestamp(),
    deleted_at       timestamp without time zone,
    created_within   text NOT NULL,
    updated_within   text NOT NULL,
    deleted_within   text,
    created_by       uuid NOT NULL REFERENCES users(id),
    brand        uuid NOT NULL REFERENCES brands(id),
   "user"        uuid NOT NULL REFERENCES users(id),
    customer     uuid NOT NULL REFERENCES brands_customers(id),
    plan         TEXT NOT NULL,
    status       subscription_status NOT NULL,
    chargebee_id TEXT NOT NULL UNIQUE,
    chargebee_object JSONB NOT NULL,

    UNIQUE(brand, "user", customer, plan)
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
