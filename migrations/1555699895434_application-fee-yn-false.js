const db = require('../lib/utils/db')
const fs = require('fs')

const ids = fs.readFileSync(`${__dirname}/application_fee_false.csv`, 'UTF-8').trim().split(/\n/g).join(',')

const sql = `UPDATE listings SET application_fee_yn = FALSE
             WHERE matrix_unique_id IN(${ids})`

const run = async () => {
  const conn = await db.conn.promise()

  await conn.query(sql)

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
