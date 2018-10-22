const sql = require('../../lib/models/SupportBot/sql')
const Context = require('../../lib/models/Context/index')
const runInContext = require('../../lib/models/Context/util')
const ContactSummary = require('../../lib/models/Contact/summary')

async function run() {
  const { count } = await sql.selectOne(`
    SELECT
      COUNT(*) AS count
    FROM
      contacts
    WHERE
      deleted_at IS NULL
      AND brand IS NOT NULL
  `, [])

  const bulk_size = 5000

  let affected_rows = 0
  for (let start = 0; start < count; start += bulk_size) {
    Context.log(`${start}...${start + bulk_size - 1}`)

    const contact_ids = await sql.selectIds(`
      SELECT
        id
      FROM
        contacts
      WHERE
        deleted_at IS NULL
        AND brand IS NOT NULL
      OFFSET $1
      LIMIT $2
    `, [
      start,
      bulk_size
    ])

    affected_rows += await ContactSummary.update(contact_ids)
  }

  if (count - affected_rows > 0) {
    Context.log(`${count - affected_rows} rows not found in contact_summaries.`)
  }
}

runInContext('fix-contact-summaries', run).then(
  () => console.log('Success!'),
  (ex) => console.error(ex)
)
