const { finalizeRecentlyDone } = require('../../../lib/models/Showing/workers/finalize_recently_done')
const { poll, shutdown } = require('../utils/poll')

function start () {
  poll({
    fn: finalizeRecentlyDone,
    name: 'Showing.finalizeRecentlyDone',
    wait: 15 * 60000 // 15 min
  })
}

module.exports = { start, shutdown }
