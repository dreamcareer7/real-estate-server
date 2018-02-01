module.exports = {
  saveUserInfo,
  getUserInfo,
  removeUserInfo
}

const dservice = require('../../data-service')
const {promisify} = require('util')
const lo = require('lodash')

const USER_CODE_REDIS_PREFIX = 'ms-graph-user-code-'
const cli = dservice.redis.createClient()
const redisGetAsync = promisify(cli.get).bind(cli)
const redisSetAsync = promisify(cli.set).bind(cli)
const redisRemoveAsync = promisify(cli.del).bind(cli)

async function saveUserInfo(userID, info) {
  if (lo.isObject(info)) {
    info = JSON.stringify(info)
  }
  try {
    await redisSetAsync(`${USER_CODE_REDIS_PREFIX}${userID}`, info)
  } catch (e) {
    console.log('Something went wrong setting the microsoft graph info of user on redis.')
  }
}

async function getUserInfo(userID) {
  return redisGetAsync(`${USER_CODE_REDIS_PREFIX}${userID}`)
}

async function removeUserInfo(userID) {
  return redisRemoveAsync(`${USER_CODE_REDIS_PREFIX}${userID}`)
}