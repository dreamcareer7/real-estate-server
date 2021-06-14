const { getAllRecentlyDone } = require('../appointment/get')
const { updateStatus } = require('../appointment/status_fsm')

async function finalizeRecentlyDone () {
  const ids = await getAllRecentlyDone()

  for (const id of ids) {
    await updateStatus(id, 'Completed')
  }
}

module.exports = { finalizeRecentlyDone }
