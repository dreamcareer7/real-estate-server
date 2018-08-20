const db = require('../lib/utils/db')
require('../lib/models')()

const Context = require('../lib/models/Context')

const sql = async (sql, args) => {
  return new Promise((resolve, reject) => {
    db.executeSql(sql, args, null, (err, res) => {
      if (err)
        return reject(err)

      resolve(res)
    })
  })
}

const run = async () => {
  const { client: conn, release } = await getDb()

  const context = Context.create({
    id: 'Migration <1534157128654_initialize-duplicate-contacts>'
  })
  context.set({
    db: conn
  })
  context.enter()

  await sql('BEGIN')

  await sql('TRUNCATE contacts_duplicate_pairs')
  await sql('TRUNCATE contacts_duplicate_clusters')
  await sql('SELECT setval(\'contact_duplicate_cluster_seq\', 1)')

  const users = (await sql(`
    SELECT
      id,
      first_name || ' ' || last_name AS name
    FROM
      users
    WHERE
      deleted_at IS NULL
      AND is_shadow IS FALSE
      AND user_type = 'Agent'
  `)).rows

  Context.log(`Initializing merge recommendations for ${users.length.toString().bold.white} users`)

  for (let i = 0; i < users.length; i++) {
    await sql('SELECT update_duplicate_pairs_for_user($1::uuid)', [users[i].id])
    const res = await sql('SELECT update_duplicate_clusters_for_user($1::uuid) AS duplicate_count', [users[i].id])

    Context.log(`${i + 1}/${users.length} ${users[i].name}: ${res.rows[0].duplicate_count.toString().bold.white} duplicate clusters`)
  }

  await sql('COMMIT')
  
  release()
}

const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, client, release) => {
      if (err)
        return reject(err)

      resolve({ client, release })
    })
  })
}

exports.up = cb => run().nodeify(cb)
exports.down = cb => cb()
