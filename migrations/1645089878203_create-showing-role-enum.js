const db = require('../lib/utils/db')

let oldRoles = ['CoSellerAgent', 'SellerAgent', 'Tenant']
let newRoles = [...oldRoles, 'Admin/Assistant', 'Other']

oldRoles = oldRoles.map(or => `'${or}'`)
newRoles = newRoles.map(nr => `'${nr}'`)

const migrations = [
  'BEGIN',

  `CREATE TYPE showing_role AS ENUM (${newRoles})`,

  // XXX: Why this won't work?!
  /* `ALTER TABLE showings_roles
   *    ALTER COLUMN role TYPE showing_role USING (CASE
   *      WHEN role::text IN (${oldRoles}) THEN role::text
   *      ELSE 'Other'
   *    END)::showing_role`,
   */

  `ALTER TABLE showings_roles
     ADD COLUMN new_role showing_role NOT NULL DEFAULT 'Other'`,

  `UPDATE showings_roles SET
     new_role = role::text::showing_role
     WHERE role IN (${oldRoles})`,

  `ALTER TABLE showings_roles
     ALTER COLUMN new_role DROP DEFAULT,
     DROP COLUMN role`,

  `ALTER TABLE showings_roles
     RENAME COLUMN new_role TO role`,
 
  'COMMIT',
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
