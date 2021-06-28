const { peanar } = require('../../../lib/utils/peanar')

async function start() {
  for (const { start } of [
    require('./common'),
    require('./email_campaign'),
    require('./integrations'),
    require('./microsoft_notifications'),
    require('./mls'),
    require('./mls_photos'),
  ]) {
    await start()
  }
}

async function shutdown() {
  await peanar.shutdown()
}

module.exports = {
  start,
  shutdown,
}
