const Nock = require('nock')
const fs = require('fs')

const nock = Nock('http://s3.aws.com')

const pdf = fs.readFileSync(`${__dirname}/example.pdf`)

nock.get('/example.pdf').reply(200, pdf)

nock.persist()
