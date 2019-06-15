// const GoogleMessage = require('../message')


const syncMessages = async (google, data) => {
  await google.batchGetMessages()



  // await google.history('13525094')

  // async function example() {
  //   let counter = 1

  //   for await (const response of google.discreteHistory('135250970')) {
  //     console.log('\n------- discreteHistory-geenrator loop#', counter++)
  //     console.log('Here:', JSON.stringify(response.data));
  //   }
  // }

  // await example()





  // await google.syncThreads()
  await google.getThread('16b1be38e41440f9')

  // const messages = await google.fullSyncMessages()
  // await google.getMessage('16b1c09ae63862a4')



  // async function example() {
  //   const max = 50

  //   let counter  = 1
  //   let messages = []

  //   for await (const response of google.discreteSyncMessages()) {
  //     console.log('\n------- discreteSyncMessages-geenrator loop#', counter++)
  //     // console.log('Here:', response.data);

  //     if(response.data.messages)
  //       messages = messages.concat(response.data.messages)

  //     console.log('messages.length:', messages.length, '\n')

  //     if( messages.length >= max )
  //       break
  //   }
  // }

  // await example()



  // async function example() {
  //   let counter = 1

  //   for await (const response of google.discreteSyncThreads()) {
  //     console.log('\n------- discreteSyncThreads-geenrator loop#', counter++)
  //     console.log('Here:', response.data);
  //   }
  // }

  // await example()





  return true
}

module.exports = {
  syncMessages
}