// const GoogleMessage = require('../message')


const partialSync = async (google, data) => {

  await google.history('13525094')

  async function example() {
    let counter = 1

    for await (const response of google.discreteHistory('135250970')) {
      console.log('\n------- discreteHistory-geenrator loop#', counter++)
      console.log('Here:', JSON.stringify(response.data))
    }
  }

  await example()



  return true
}

module.exports = {
  partialSync
}