const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE SCHEMA de',
  `CREATE TABLE de.regions (
    name TEXT UNIQUE,
    brand uuid NOT NULL REFERENCES public.brands(id)
  )`,
  `CREATE TABLE de.offices (
    id INT NOT NULL UNIQUE,
    brand uuid NOT NULL REFERENCES public.brands(id),
    admin_role uuid NOT NULL REFERENCES public.brands_roles(id)
  )`,
  `CREATE TABLE de.users (
      username TEXT NOT NULL UNIQUE,
      "user" uuid UNIQUE REFERENCES public.users(id),
      object JSONB NOT NULL,
      updated_at timestamp with time zone NOT NULL
   )`,
  `CREATE TABLE de.admins_offices (
    username TEXT REFERENCES de.users(username),
    office INT REFERENCES de.offices(id),

    CONSTRAINT admin_office UNIQUE(username, office)
  )`,
  `CREATE TABLE de.agents_offices (
    username TEXT REFERENCES de.users(username),
    office INT REFERENCES de.offices(id),
    "user" uuid NOT NULL REFERENCES public.users(id),
    brand uuid NOT NULL REFERENCES public.brands(id),
    agent_role uuid NOT NULL REFERENCES public.brands_roles(id),

    CONSTRAINT agent_office UNIQUE(username, office)
  )`,
  'ALTER TABLE sso_providers ADD COLUMN domain TEXT',
  'ALTER TABLE users ADD website TEXT',
  'ALTER TABLE users ADD instagram TEXT',
  'ALTER TABLE users ADD twitter TEXT',
  'ALTER TABLE users ADD linkedin TEXT',
  'ALTER TABLE users ADD youtube TEXT',
  'ALTER TABLE users ADD facebook TEXT',
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
