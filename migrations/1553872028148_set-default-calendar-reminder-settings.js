const sql = require('../lib/utils/sql')
const { executeInContext } = require('../lib/models/Context/util')
const { set_default_notification_settings } = require('../lib/models/Calendar/worker/index')

async function run() {
  const user_brands = await sql.select(`
    SELECT DISTINCT
      bu.user,
      br.brand
    FROM
      brands b
      JOIN brands_roles br
        ON b.id = br.brand
      JOIN brands_users bu
        ON br.id = bu.role
    WHERE
      br.deleted_at IS NULL
      AND b.deleted_at IS NULL
      AND bu.deleted_at IS NULL
      AND br.acl @> ARRAY['CRM']
      AND NOT EXISTS (
        SELECT
          id
        FROM
          calendar_notification_settings AS cns
        WHERE
          cns.user = bu.user
          AND cns.brand = br.brand
      )
  `, [])

  for (const {user, brand} of user_brands) {
    await set_default_notification_settings({ data: { user, brand }})
  }
}

exports.up = cb => {
  executeInContext('1553872028147_set-default-calendar-reminder-settings', run).then(cb).catch(err => { console.error(err); cb(err) })
}

exports.down = () => {}
