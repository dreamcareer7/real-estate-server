const { getAllRecentlyDone } = require('../appointment/get')
const { updateStatus } = require('../appointment/status_fsm')

async function finalizeRecentlyDone () {
  const results = await getAllRecentlyDone()

  /* TODO: At some point We're gonna need to remove this loop and replace it
   * with a single query. */
  for (const r of results) {
    const newStatus = r.status === 'Confirmed' ? 'Completed' : 'Canceled'    
    await updateStatus(r.id, newStatus)
  }
}

module.exports = { finalizeRecentlyDone }
