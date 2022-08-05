const _ = require('lodash')

const Attribute = require('../../lib/models/Contact/attribute/manipulate')
const sql = require('../../lib/utils/sql')
const { runInContext } = require('../../lib/models/Context/util')
const Context = require('../../lib/models/Context/index')

const QUERY = `
  SELECT
    c.id,
    ca.text,
    (array_agg(ca.id))[1] AS attribute_id,
    count(ca.id)
  FROM
    contacts_attributes_text AS ca
    JOIN contacts AS c
      ON c.id = ca.contact
  WHERE
    ca.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND c.brand = $1::uuid
    AND ca.attribute_type = 'tag'
  GROUP BY
    c.id,
    ca.text
  HAVING
    count(ca.id) = 2
`

runInContext('cleanup-duplicate-tags', async (program) => {
  const options = program.opts()
  const brand = options.brand

  const ids = await sql.map(QUERY, [ brand ], row => row.attribute_id)
  Context.log(`Found ${ids.length} tag attributes. Going to delete all in 5000 chunks...\n`)
  for (const chunk of _.chunk(ids, 5000)) {
    Context.log(`deleting ${chunk.length} tag attributes...`)
    await Attribute.delete(chunk, options.user)
  }
}).catch((e) => {
  console.error(e)
})
