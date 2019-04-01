const Context = require('../../lib/models/Context/index')
const { runInContext } = require('../../lib/models/Context/util')

const ContactWorker = require('../../lib/models/Contact/worker/contact')

runInContext('refresh_contacts_users', async () => {
  Context.log('REFRESH MATERIALIZED VIEW contacts_users;')
  await ContactWorker.refreshContactsUsers()
})
  .then(() => process.exit())
  .catch(e => {
    console.log(e)
    process.exit()
  })
