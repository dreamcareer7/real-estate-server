const { updateRecentlyDone } = require('../../../lib/models/Showing/workers/update_recently_done')
const { poll, shutdown } = require('../utils/poll')

function start () {
  poll({
    fn: updateRecentlyDone,
    name: 'Showing.updateRecentlyDone',
    wait: 15 * 60_000 // 15 min
  })
}

module.exports = { start, shutdown }
