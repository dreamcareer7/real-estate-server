const request = require('request-promise-native')
const db = require('../../../utils/db')

BrokerWolf.Members = {}

BrokerWolf.Members.sync = async () => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/members/v1/',
  }

  const req = BrokerWolf.tokenize(options)

  const res = JSON.parse(await request(req))

  for (const a of res) {
    await db.query.promise('brokerwolf/members/insert', [
      a.Id,
      a
    ])

    for (const board of a.MLSBoards)
      await db.query.promise('brokerwolf/members/boards/insert', [
        a.Id,
        board.MLSId,
        board.MLSAreaId
      ])
  }
}