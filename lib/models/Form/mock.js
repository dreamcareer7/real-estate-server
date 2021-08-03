const fs = require('fs')
const { URL } = require('url')
const Nock = require('nock')
const config = require('../../../lib/config.js')
const { getServiceUrl } = require('./submission/get')
const url = new URL(getServiceUrl(Number(new Date)))
const nock = Nock(url.origin)

const pdf = fs.readFileSync(__dirname + '/mock.pdf')

nock.post('/generate.pdf').reply(200, pdf)

nock.persist()