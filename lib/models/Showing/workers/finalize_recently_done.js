const { getAllRecentlyDone } = require('../appointment/get')
const { updateStatus } = require('../appointment/status_fsm')

async function finalizeRecentlyDone () {
  const ids = await getAllRecentlyDone()
  
  if (!ids.length) {
    return
  }

  const promises = ids.map(id => updateStatus(id, 'Completed'))
  
  return Promise.all(promises)
}

module.exports = { finalizeRecentlyDone }
