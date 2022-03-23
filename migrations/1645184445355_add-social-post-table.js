const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE social_posts (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand uuid NOT NULL REFERENCES brands(id),
    "user" uuid NOT NULL REFERENCES users(id),
    template uuid NOT NULL REFERENCES templates_instances(id),
    facebook_page uuid REFERENCES facebook_pages(id),
    insta_file uuid REFERENCES files(id),
    due_at timestamp,
    executed_at timestamp,    
    failed_at timestamp,
    failure text,
    caption text NOT NULL,
    published_media_id text,
    post_link text,
    created_at timestamp DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamp        
  )`,
  'COMMIT',
]

const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = (cb) => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
