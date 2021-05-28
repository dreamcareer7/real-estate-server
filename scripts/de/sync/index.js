#!/usr/bin/env node

// require('../../connection')
// reqduire('../../../lib/utils/db')
// require('../../../lib/models/index')

const request = require('request-promise-native')
const _ = require('lodash')

const MLSJob = require('../../../lib/models/MLSJob')

const syncRegions = require('./sync-regions')
const syncOffices = require('./sync-offices')
const syncAgents = require('./sync-agents')
const syncUsers = require('./sync-users')
const getRoot = require('./get-root')

const createContext = require('../../workers/create-context')

const config = {
  url: 'https://webapi.elliman.com/token?username=emil@rechat.com&password=Skiing4-Monetize-Excitable'
}

const getToken = async () => {
  const { token } = await request({
    uri: config.url,
    json: true
  })

  return token
}

const getData = async token => {
  const uri = 'https://webapi.elliman.com/api/rechat/users'

  const users = await request({
    uri,
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  })

  const offices = _.chain(users)
    .map('offices')
    .flatten()
    .uniqBy('id')
    .value()

  const regions = _.chain(offices)
    .map('majorRegion')
    .sort()
    .uniq()
    .value()

  return { users, regions, offices }
}

/*
 * TODO: Existing Users
 */

const sync = async () => {
  const token = await getToken()
  const { users, regions, offices } = await getData(token)

  const date = new Date()
  require('fs').writeFileSync(`/tmp/${date}.json`, JSON.stringify(users))

  await getRoot() // Ensure root exists
  await syncRegions(regions)
  await syncUsers(users)
  await syncOffices(offices)
  await syncAgents(users)

  await promisify(MLSJob.insert)({
    name: 'de_users'
  })
}

const run = async() => {
  const { commit, run } = await createContext()

  await run(async () => {
    await sync()
    await commit()
  })
}

run()
  .then(() => {
    process.exit()
  })
  .catch(e => {
    console.log(e)
    process.exit()
  })
