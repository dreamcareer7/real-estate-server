const request = require('request-promise-native')

BrokerWolf.Members = {}

BrokerWolf.Members.sync = async () => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/members/v1/',
  }

  const req = BrokerWolf.tokenize(options)

  console.log(req)

  const res = await request(req)
  console.log(res)
}