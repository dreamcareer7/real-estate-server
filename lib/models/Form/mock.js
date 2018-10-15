const Nock = require('nock')
const fs = require('fs')
const config = require('../../../lib/config.js')
const nock = Nock(config.forms.url)

const pdf = fs.readFileSync(__dirname + '/mock.pdf')

nock.post('/generate.pdf').reply(200, pdf)

nock.persist()
