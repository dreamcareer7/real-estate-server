const { monitor } = require('../../../lib/monitoring')

const createMonitor = async ({ name, wait }) => {
  await monitor({ name, wait })
}

module.exports = createMonitor