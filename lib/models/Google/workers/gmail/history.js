// const config = require('../../../../config')

// const GoogleMessage = require('../../message')
const GoogleCredential = require('../../credential')


const partialSync = async (google, data) => {
  const credentialId = data.googleCredential.id
  const messages_sync_history_id = null

  await google.history(data.googleCredential.messages_sync_history_id)

  async function example() {
    let counter = 1

    for await (const response of google.discreteHistory('135250970')) {
      console.log('\n------- discreteHistory-geenrator loop#', counter++)
      console.log('Here:', JSON.stringify(response.data))
    }
  }

  await example()



  GoogleCredential.updateMessagesSyncHistoryId(credentialId, messages_sync_history_id)

  return {
    status: true,
    ex: null,
    createdNum: 0,
    totalNum: 0
  }
}

module.exports = {
  partialSync
}