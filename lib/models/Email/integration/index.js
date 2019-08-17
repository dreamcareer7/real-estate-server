const db = require('../../../utils/db.js')


const EmailIntegration = {}


EmailIntegration.getByThread = async (thread_id) => {
  const messages = await db.select('email/integration/get_by_thread', [thread_id])

  return messages
}


module.exports = EmailIntegration