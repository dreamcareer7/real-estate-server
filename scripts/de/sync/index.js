#!/usr/bin/env node

// require('../../connection')
// reqduire('../../../lib/utils/db')
// require('../../../lib/models/index')

const request = require('request-promise-native')
const _ = require('lodash')
const fs = require('fs')

const MLSJob = require('../../../lib/models/MLSJob')

const syncRegions = require('./sync-regions')
const syncOffices = require('./sync-offices')
const syncAgents = require('./sync-agents')
const syncUsers = require('./sync-users')
const getRoot = require('./get-root')

const promisify = require('../../../lib/utils/promisify')
const createContext = require('../../workers/utils/create-context')

const attachModelEventListeners = require('../../../lib/models/Context/events')

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
  const normal_users = await request({
    uri: 'https://webapi.elliman.com/api/rechat/users',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  })

  const all_users = await request({
    uri: 'https://webapi.elliman.com/api/rechat/users/full',
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

  const users = _.map(normal_users, user => {
    user.mlses = [
      {mls: mlsName(user.mlsSystem), id: user.rbnyAgentId ?? user.id}
    ]

    const secondaries = indexed_duals[user.id]?.secondaryAgentId || []

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
  }).filter(Boolean)

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

  fs.writeFileSync('/tmp/normal-users.json', JSON.stringify(normal_users, 4, 4))
  fs.writeFileSync('/tmp/all-users.json', JSON.stringify(all_users, 4, 4))
  fs.writeFileSync('/tmp/duals.json', JSON.stringify(duals, 4, 4))
  fs.writeFileSync('/tmp/users.json', JSON.stringify(users, 4, 4))

  return { users, regions, offices }
}

/*
 * TODO: Existing Users
 */

const sync = async () => {
  const token = await getToken()
  const { users, regions, offices } = await getData(token)

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
  attachModelEventListeners()
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
