const db = require('../lib/utils/db')

      address: mls_office.StreetAddress,
      city: mls_office.,
      postal_code: mls_office.,
      postal_code_plus4: mls_office.,
      state: mls_office.,


const migrations = [
  `UPDATE offices SET
    address = mls_data.value->>'StreetAddress',
    city = mls_data.value->>'StreetCity',
    postal_code = mls_data.value->>'StreetPostalCode',
    postal_code_plus4 = mls_data.value->>'StreetPostalCodePlus4',
    state = mls_data.value->>'StreetStateOrProvince'
  FROM mls_data
  WHERE mls_data.matrix_unique_id = offices.matrix_unique_id AND mls_data.mls = offices.mls
  AND offices.mls = 'NTREIS'`
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
