const { executeInContext } = require('../lib/models/Context/util')
const db = require('../lib/utils/db')
const sql = require('../lib/utils/sql')
const promisify = require('../lib/utils/promisify')

const ContactAttribute = require('../lib/models/Contact/attribute')
const Context = require('../lib/models/Context')
const Job = require('../lib/models/Job')
const Task = require('../lib/models/CRM/Task')
const User = require('../lib/models/User')

const run = async () => {
  await db.executeSql.promise('BEGIN')

  const tasks = await sql.select(`
    SELECT
      ca.id AS attribute_id,
      c.brand,
      ca.created_by,
      '' AS title,
      ca.text AS description,
      ca.created_at AS due_date,
      'DONE' AS status,
      'Note' AS task_type,
      ARRAY[c.user] AS assignees,
      array_to_json(ARRAY[json_build_object(
        'association_type', 'contact',
        'contact', c.id
      )]) AS associations
    FROM
      contacts AS c
      JOIN contacts_attributes AS ca
        ON c.id = ca.contact
    WHERE
      ca.attribute_type = 'note'
      AND ca.deleted_at IS NULL
      AND c.deleted_at IS NULL
  `)

  const user = /** @type {IUser} */ (await User.getByEmail('test@rechat.com'))

  await Task.createMany(tasks)
  await ContactAttribute.delete(tasks.map(t => t.attribute_id), user.id)

  await db.executeSql.promise('COMMIT')

  const jobs = Context.get('jobs')
  await promisify(Job.handle)(jobs)
}

exports.up = cb => {
  executeInContext('migrations', run).then(cb).catch(cb)
}

exports.down = () => {}
