const Nock = require('nock')
const config = require('../../../lib/config.js')
const fs = require('fs')

const nock = Nock('http://www.dallascad.org/')

nock.post('/SearchAddr.aspx').reply(200, (uri, req) => {
  return fs.createReadStream(`${__dirname}/example.html`);
})

nock.persist()