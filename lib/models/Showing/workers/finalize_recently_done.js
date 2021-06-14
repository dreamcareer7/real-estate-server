const { getAllRecentlyDone } = require('../appointment/get')
const { updateStatus } = require('../appointment/status_fsm')

async function finalizeRecentlyDone () {
  const results = await getAllRecentlyDone()

  for (const r of results) {
    const newStatus = r.status === 'Confirmed' ? 'Completed' : 'Canceled'    
    await updateStatus(r.id, newStatus)
  }
}

module.exports = { finalizeRecentlyDone }
