const db = require('../lib/utils/db')

const migrations = [
  `UPDATE brand_settings SET
    theme."navbar-button-main" = (theme)."primary-main",
    theme."navbar-button-light" = (theme)."primary-main",
    theme."navbar-button-contrast-text" = COALESCE((theme)."primary-contrast-text", '#ffffff')
    WHERE (theme)."primary-main" IS NOT NULL RETURNING *`
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
