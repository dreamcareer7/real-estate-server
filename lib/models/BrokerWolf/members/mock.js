const Nock = require('nock')
const config = require('../../../config.js')

const sample = require('./sample')
/*
const nock = Nock(config.brokerwolf.host)

nock.get('/wolfconnect/members/v1/').reply(200, JSON.stringify(sample))

nock.persist()*/