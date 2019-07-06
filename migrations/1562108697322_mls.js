const db = require('../lib/utils/db')
const fs = require('fs')

const ae = fs.readFileSync(__dirname + '/../lib/sql/agent/agents_emails.mv.sql', 'utf-8')
const ap = fs.readFileSync(__dirname + '/../lib/sql/agent/agents_phones.mv.sql', 'utf-8')
const ut = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.trigger.sql', 'utf-8')
const mc = fs.readFileSync(__dirname + '/../lib/sql/deal/context/get_mls_context.fn.sql', 'utf-8')
const lf = fs.readFileSync(__dirname + '/../lib/sql/alert/update_listings_filters.fn.sql', 'utf-8')
const ba = fs.readFileSync(__dirname + '/../lib/sql/brand/get_brand_agents.fn.sql', 'utf-8')
const bu = fs.readFileSync(__dirname + '/../lib/sql/brand/get_brand_users.fn.sql', 'utf-8')
const pa = fs.readFileSync(__dirname + '/../lib/sql/brand/propose_brand_agents.fn.sql', 'utf-8')

const migrations = [
  'BEGIN',
  `CREATE TYPE mls
     AS ENUM('NTREIS')`,

  'ALTER TABLE listings RENAME COLUMN mls TO mls_name',
  'ALTER TABLE offices  RENAME COLUMN mls TO mls_name',

  'ALTER TABLE agents         ADD mls mls',
  'ALTER TABLE listings       ADD mls mls',
  'ALTER TABLE properties     ADD mls mls',
  'ALTER TABLE addresses      ADD mls mls',
  'ALTER TABLE offices        ADD mls mls',
  'ALTER TABLE open_houses    ADD mls mls',
  'ALTER TABLE property_rooms ADD mls mls',
  'ALTER TABLE property_units ADD mls mls',
  'ALTER TABLE photos         ADD mls mls',

  'UPDATE properties     SET mls = \'NTREIS\'',
  'UPDATE addresses      SET mls = \'NTREIS\'',
  'UPDATE offices        SET mls = \'NTREIS\'',
  'UPDATE property_rooms SET mls = \'NTREIS\'',
  'UPDATE property_units SET mls = \'NTREIS\'',
  // Other tables have updates below

  'ALTER TABLE agents      ADD office           uuid REFERENCES offices(id)',
  'ALTER TABLE photos      ADD listing          uuid REFERENCES listings(id)',
  'ALTER TABLE open_houses ADD listing          uuid REFERENCES listings(id)',
  'ALTER TABLE listings    ADD list_agent       uuid REFERENCES agents(id)',
  'ALTER TABLE listings    ADD co_list_agent    uuid REFERENCES agents(id)',
  'ALTER TABLE listings    ADD selling_agent    uuid REFERENCES agents(id)',
  'ALTER TABLE listings    ADD co_selling_agent uuid REFERENCES agents(id)',
  'ALTER TABLE listings    ADD list_office      uuid REFERENCES offices(id)',
  'ALTER TABLE listings    ADD selling_office   uuid REFERENCES offices(id)',

  `UPDATE agents SET
    mls = 'NTREIS',
    office = (SELECT id FROM offices WHERE offices.matrix_unique_id = agents.office_mui)`,

  `UPDATE photos SET
    mls = 'NTREIS',
    listing = (SELECT id FROM listings WHERE listings.matrix_unique_id = photos.listing_mui)`,

  `UPDATE open_houses SET
    mls = 'NTREIS',
    listing = (SELECT id FROM listings l WHERE l.matrix_unique_id = open_houses.listing_mui)`,

  `UPDATE listings SET
    mls              = 'NTREIS',
    list_agent       = (SELECT id FROM agents  WHERE matrix_unique_id = listings.list_agent_mui),
    selling_agent    = (SELECT id FROM agents  WHERE matrix_unique_id = listings.selling_agent_mui),
    co_list_agent    = (SELECT id FROM agents  WHERE matrix_unique_id = listings.list_agent_mui),
    co_selling_agent = (SELECT id FROM agents  WHERE matrix_unique_id = listings.selling_agent_mui),
    list_office      = (SELECT id FROM offices WHERE matrix_unique_id = listings.list_office_mui),
    selling_office   = (SELECT id FROM offices WHERE matrix_unique_id = listings.selling_office_mui)`,

  'ALTER TABLE listings       ALTER mls SET NOT NULL',
  'ALTER TABLE offices        ALTER mls SET NOT NULL',
  'ALTER TABLE open_houses    ALTER mls SET NOT NULL',
  'ALTER TABLE property_rooms ALTER mls SET NOT NULL',
  'ALTER TABLE property_units ALTER mls SET NOT NULL',
  'ALTER TABLE photos         ALTER mls SET NOT NULL',

  'ALTER TABLE agents         DROP CONSTRAINT agents_matrix_unique_id_key',
  'ALTER TABLE open_houses    DROP CONSTRAINT open_houses_matrix_unique_id_key',
  'ALTER TABLE photos         DROP CONSTRAINT photos_matrix_unique_id_key',

  'DROP INDEX listings_matrix_unique_id_idx',
  'DROP INDEX offices_mui_idx',
  'DROP INDEX property_rooms_mui_idx',
  'DROP INDEX units_mui_idx',

  'ALTER TABLE agents         ADD CONSTRAINT agents_mui_mls         UNIQUE (matrix_unique_id, mls)',
  'ALTER TABLE listings       ADD CONSTRAINT listings_mui_mls       UNIQUE (matrix_unique_id, mls)',
  'ALTER TABLE properties     ADD CONSTRAINT properties_mui_mls     UNIQUE (matrix_unique_id, mls)',
  'ALTER TABLE addresses      ADD CONSTRAINT addresses_mui_mls      UNIQUE (matrix_unique_id, mls)',
  'ALTER TABLE offices        ADD CONSTRAINT offices_mui_mls        UNIQUE (matrix_unique_id, mls)',
  'ALTER TABLE open_houses    ADD CONSTRAINT open_houses_mui_mls    UNIQUE (matrix_unique_id, mls)',
  'ALTER TABLE property_units ADD CONSTRAINT property_units_mui_mls UNIQUE (matrix_unique_id, mls)',
  'ALTER TABLE property_rooms ADD CONSTRAINT property_rooms_mui_mls UNIQUE (matrix_unique_id, mls)',
  'ALTER TABLE photos         ADD CONSTRAINT photos_mui_mls         UNIQUE (matrix_unique_id, mls)',

  'DROP MATERIALIZED VIEW agents_emails',
  'DROP MATERIALIZED VIEW agents_phones',

  'DROP FUNCTION get_brand_agents(uuid)',
  'DROP FUNCTION propose_brand_agents(uuid, uuid)',

  ae,
  ap,
  ut,
  mc,
  lf,
  ba,
  bu,
  pa,

  'ALTER TABLE recommendations DROP matrix_unique_id',

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
