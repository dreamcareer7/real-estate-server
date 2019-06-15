// const GoogleThread  = require('../thread')



const syncThreads = async (google, data) => {
  await google.fullSyncThreads()

  // await google.listThreads()
  // await google.listMessages()
  // await google.getMessage('16b02d534f4bf27e')
  // await google.getThread('16b02d534f4bf27e')  

  return true
}

module.exports = {
  syncThreads
}