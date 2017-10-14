const request = require('request-promise-native')

BrokerWolf.Classifications = {}

BrokerWolf.Classifications.sync = async () => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/classifications/v1/',
  }

  const req = BrokerWolf.tokenize(options)

  console.log(req)

  const res = await request(req)
  console.log(res)
}