const fs = require('fs')
const db = require('../lib/utils/db')

module.exports.down = function () {} // Sorry.

module.exports.up = up

const sql_save = fs.readFileSync(__dirname + '/../lib/sql/migration/save.sql').toString()

function up (cb) {
  const migrations = fs.readdirSync(__dirname)
  db.conn((err, client, done) => {
    if (err)
      return cb(err)

    client.query(sql_save, [JSON.stringify(migrations)], (err) => {
      done()

      if (err)
        return cb(err)

      console.log('This special migration needs a restart. App will now exit. Next start will be healthy. Sorry.')
      process.exit()
    })
  })
}
