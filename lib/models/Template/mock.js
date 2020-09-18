const Nock = require('nock')
const config = require('../../config')

const nock = Nock(config.screenshots.host)

nock
  .post('/screenshot')
  .reply(200)

nock.persist()
