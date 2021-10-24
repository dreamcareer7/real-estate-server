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

const promisify = require('../../../lib/utils/promisify')
const createContext = require('../../workers/utils/create-context')

const attachContactEventHandlers = require('../../../lib/models/Contact/events')

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

const mlses = {
  LIMO: 'REBNY',
  ONEKEY: 'ONEKEY',
  HGMLS: 'ONEKEY',
  SAND: 'SDMLS',
  GFLR: 'RAPB',
  MFR: 'STELLAR',
  
}

const mlsName = name => {
  return mlses[name.toUpperCase()] ?? name
}

const getData = async token => {
  const uri = 'https://webapi.elliman.com/api/rechat/users'

  const all_users = await request({
    uri,
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  })
  const indexed_users = _.keyBy(all_users, 'id')

  const duals =  await request({
    uri: 'https://webapi.elliman.com/api/rechat/dualagents',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  })
  const indexed_duals = _.keyBy(duals, 'primaryAgentId')
  const secondary_ids = _.flatten(_.map(duals, 'secondaryAgentId'))
  const primary_ids = _.difference(_.map(all_users, 'id'), secondary_ids)

  const users = _.map(primary_ids, id => {
    const user = indexed_users[id]
    user.mlses = [
      {mls: mlsName(user.mlsSystem), id: user.id}
    ]

    const secondaries = indexed_duals[id]?.secondaryAgentId || []


    secondaries.forEach(secondary_id => {
      const secondary_user = indexed_users[secondary_id]
      if (!secondary_user)
        return

      user.mlses.push({
        mls: mlsName(secondary_user.mlsSystem), 
        id: secondary_user.id
      })

      user.offices.push(...secondary_user.offices)
    })

    return user
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
  attachContactEventHandlers()
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
