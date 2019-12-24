const db = require('../lib/utils/db')

/*
 * We don't want a galleries.deal
 * We rather have deals.gallery.
 *
 * However, we need the migration to create
 * a gallery for each deal. Since we cannot have INSERT as a
 * subquery, it's a bit difficult.
 *
 * So we add a temporary galleries.deal. Insert all new galleries,
 * then update the deals based on it and remove the temp column
 */

const migrations = [
  'BEGIN',
  `CREATE TABLE galleries (
      id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
      deal uuid REFERENCES deals(id)
  )`,
  `CREATE TABLE gallery_items (
      id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
      gallery uuid NOT NULL REFERENCES galleries(id),
      name TEXT NOT NULL,
      description TEXT,
      "order" SMALLINT NOT NULL DEFAULT 0,
      file uuid NOT NULL REFERENCES files(id)
  )`,

  'ALTER TABLE deals ADD gallery uuid REFERENCES galleries(id)',

  `INSERT INTO galleries(deal) SELECT id FROM deals`,

  `UPDATE deals SET gallery = (
      SELECT id FROM galleries WHERE deal = galleries.deal
  )`,

  'ALTER TABLE galleries DROP deal',

  'ALTER TABLE deals ALTER gallery SET NOT NULL',

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
