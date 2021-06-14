const { getAllRecentlyDone } = require('../appointment/get')
const { updateStatus } = require('../appointment/status_fsm')

async function finalizeRecentlyDone () {
  const results = await getAllRecentlyDone()

  for (const r of results) {
    await updateStatus(r.id, 'Completed')
  }
}

module.exports = { finalizeRecentlyDone }
