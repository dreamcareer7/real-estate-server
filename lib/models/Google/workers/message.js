// const GoogleMessage = require('../message')


const syncMessages = async (google, data) => {

  async function example() {
    const max = 4

    let counter   = 1
    let messages  = []

    for await (const response of google.discreteSyncMessages()) {
      console.log('\n------- discreteSyncMessages-generator loop#', counter++)
      // console.log('Here:', response.data);

      if(response.data.messages) {

        const multipart = response.data.messages.map(message => ({
          'Content-Type': 'application/http',
          'Content-ID': message.id,
          'body': `GET gmail/v1/users/me/messages/${message.id} HTTP/1.1\n`
        }))

        await google.batchGetMessages(multipart)

        messages = messages.concat(response.data.messages)
      }

      console.log('messages.length:', messages.length, '\n')

      if( messages.length >= max )
        break
    }

    return messages
  }

  const messages = await example()

  console.log(messages)
  console.log()


  return true
}

module.exports = {
  syncMessages
}