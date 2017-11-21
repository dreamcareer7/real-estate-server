const request = require('request-promise-native')

BrokerWolf.Classifications = {}

BrokerWolf.Classifications.sync = async () => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/Classifications/v1/',
  }

  const req = BrokerWolf.tokenize(options)

  const res = await request(req)
}