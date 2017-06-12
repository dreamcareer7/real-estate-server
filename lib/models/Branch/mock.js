const Nock = require('nock')
const config = require('../../config.js')

const nock = Nock(config.branch.base_url)

nock.post('/v1/url').reply(200, {
  url: 'http://mock-branch-url'
})


nock.persist()