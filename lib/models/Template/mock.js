const Nock = require('nock')
const config = require('../../config')

const url = new URL(config.screenshots.endpoint)
const nock = Nock(url.origin)

nock
  .post('/screenshot')
  .reply(200)

nock.persist()
