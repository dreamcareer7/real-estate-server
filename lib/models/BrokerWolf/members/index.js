const request = require('request-promise-native')
const db = require('../../../utils/db')

BrokerWolf.Members = {}

BrokerWolf.Members.sync = async brand => {
  return pageByPage(brand)
}

const pageByPage = async brand => {
  let page = 0
  const limit = 300
  let done = false
  let all = []

  do {
    const results = await savePage({page, limit, brand})

    all = all.concat(results)

    if (results.length < limit)
      done = true

    page++

  } while(!done)

  return all
}

const savePage = async ({page, limit, brand}) => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/members/v1/',
    qs: {
      '$orderby': 'CreatedTimestamp',
      '$top': limit,
      '$skip': page * limit
    },
    brand
  }

  const req = await BrokerWolf.tokenize(options)

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

  return res
}
