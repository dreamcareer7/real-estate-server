const db = require('../lib/utils/db')
const fs = require('fs')

const ae = get_mls_context = fs.readFileSync(__dirname + '/../lib/sql/agent/agents_emails.mv.sql', 'utf-8')
const ap = get_mls_context = fs.readFileSync(__dirname + '/../lib/sql/agent/agents_phones.mv.sql', 'utf-8')

const migrations = [
  'BEGIN',
  `CREATE TYPE mls
     AS ENUM('NTREIS')`,

  'ALTER TABLE listings RENAME COLUMN mls TO mls_name',
  'ALTER TABLE offices  RENAME COLUMN mls TO mls_name',

  'ALTER TABLE agents         ADD mls mls',
  'ALTER TABLE listings       ADD mls mls',
  'ALTER TABLE offices        ADD mls mls',
  'ALTER TABLE open_houses    ADD mls mls',
  'ALTER TABLE property_rooms ADD mls mls',
  'ALTER TABLE property_units ADD mls mls',
  'ALTER TABLE photos         ADD mls mls',

  'UPDATE agents         SET mls = \'NTREIS\'',
  'UPDATE listings       SET mls = \'NTREIS\'',
  'UPDATE offices        SET mls = \'NTREIS\'',
  'UPDATE open_houses    SET mls = \'NTREIS\'',
  'UPDATE property_rooms SET mls = \'NTREIS\'',
  'UPDATE property_units SET mls = \'NTREIS\'',
  'UPDATE photos         SET mls = \'NTREIS\'',

  'ALTER TABLE agents         ALTER mls SET NOT NULL',
  'ALTER TABLE listings       ALTER mls SET NOT NULL',
  'ALTER TABLE offices        ALTER mls SET NOT NULL',
  'ALTER TABLE open_houses    ALTER mls SET NOT NULL',
  'ALTER TABLE property_rooms ALTER mls SET NOT NULL',
  'ALTER TABLE property_units ALTER mls SET NOT NULL',
  'ALTER TABLE photos         ALTER mls SET NOT NULL',

  'ALTER TABLE agents ADD office uuid REFERENCES offices(id)',
  'ALTER TABLE photos ADD listing uuid REFERENCES listings(id)',

  'UPDATE agents SET listing = (SELECT id FROM listings WHERE listing.matrix_unique_id = agents.office_mui)',
  'UPDATE photos SET listing = (SELECT id FROM listings WHERE listing.matrix_unique_id = photos.listing_mui)',


  'DROP MATERIALIZED VIEW agents_emails',
  'DROP MATERIALIZED VIEW agents_phones',

  ae,
  ap,

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
