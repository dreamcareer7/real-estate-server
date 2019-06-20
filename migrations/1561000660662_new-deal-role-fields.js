const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE EXTENSION IF NOT EXISTS fuzzystrmatch',
  'CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder',
  'CREATE EXTENSION IF NOT EXISTS address_standardizer',
  'CREATE EXTENSION IF NOT EXISTS address_standardizer_data_us',
  'DROP TABLE IF EXISTS tiger.foo', // This has been there for ages for some reason ?

  `CREATE OR REPLACE FUNCTION JSON_TO_STADDR(input JSONB)
RETURNS stdaddr AS $$
  SELECT
    ROW(
      $1->>'building',
      $1->>'house_num',
      $1->>'predir',
      $1->>'equal',
      $1->>'pretype',
      $1->>'name',
      $1->>'suftype',
      $1->>'sufdir',
      $1->>'ruralroute',
      $1->>'extra',
      $1->>'city',
      $1->>'state',
      $1->>'country',
      $1->>'postcode',
      $1->>'box',
      $1->>'unit'
    )::stdaddr
$$
LANGUAGE SQL`,

  'ALTER TABLE deals_roles ADD office_name TEXT',
  'ALTER TABLE deals_roles ADD office_email TEXT',
  'ALTER TABLE deals_roles ADD office_phone TEXT',
  'ALTER TABLE deals_roles ADD office_fax TEXT',
  'ALTER TABLE deals_roles ADD office_license_number TEXT',
  'ALTER TABLE deals_roles ADD office_mls_id TEXT',
  'ALTER TABLE deals_roles ADD office_address stdaddr',
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
