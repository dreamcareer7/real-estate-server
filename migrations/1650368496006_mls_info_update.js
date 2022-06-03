const db = require('../lib/utils/db')

const mlsListQuery = 'SELECT enum_range(NULL::mls)'

const disclaimer = `
MLS Data Display by {{MLS}}
<br>
Listing information provided in part by the {{MLS}}, for personal, non-commercial use by viewers of this site and may not be reproduced or redistributed. All information is deemed reliable but not guaranteed. Copyright © {{MLS}} 2022. All rights reserved. Last updated at Mar 23, 2022 11:45 PM.
The data relating to real estate for sale on this website appears in part through the {{MLS}} Internet Data Exchange program, a voluntary cooperative exchange of property listing data between licensed real estate brokerage firms in which participates, and is provided by {{MLS}} through a licensing agreement.
`

const migration = 'UPDATE mls_info SET disclaimer=$2  WHERE mls=$1'


const run = async () => {
  const { conn } = await db.conn.promise()

  const { rows } = await conn.query(mlsListQuery)

  const mlsList = rows[0].enum_range.replace('{', '').replace('}', '').split(',')

  for (const mls of mlsList) {
    if (mls === 'REBNY') continue
    await conn.query(migration, [mls, disclaimer.replaceAll('{{MLS}}', mls)])
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => { }
