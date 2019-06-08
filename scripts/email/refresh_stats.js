const Context = require('../../lib/models/Context/index')
const { runInContext } = require('../../lib/models/Context/util')
const sql = require('../../lib/utils/sql')

runInContext('refresh_email_stats', async () => {
  Context.log('Refreshing email stats...')
  await sql.query(`
    SELECT
      subject,
      users.email,
      delivered,
      opened,
      clicked,
      failed,
      due_at,
      executed_at,
      update_email_campaign_stats(email_campaigns.id) a
    FROM
      email_campaigns
      JOIN users
        ON users.id = email_campaigns.created_by
    ORDER BY
      email_campaigns.created_at DESC
    LIMIT 100;
  `)
})
  .then(() => process.exit())
  .catch(e => {
    console.log(e)
    process.exit()
  })
