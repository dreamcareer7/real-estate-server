const Nock = require('nock')
const config = require('../../../lib/config.js')

const nock = Nock(config.forms.url)

nock.post('/generate.pdf').reply(200, 'PDF')

nock.persist()