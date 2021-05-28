const { peanar } = require('../../utils/peanar')

const User = require('../../models/User/get')
const { getMatchingIds, getCurrentBrand } = require('./common')
const Context = require('../../models/Context')

const workers = {}

/**
 * @param {function} fn 
 */
async function registerWorker(fn) {
  workers[fn.name] = peanar.job({
    handler: workerizedHandler(fn),
    name: fn.name,
    exchange: 'contacts',
    queue: 'contacts',
  })
}

/**
 * @param {function} fn 
 * @returns 
 */
function workerize(fn) {
  return async req => {
    const { ids } = await getMatchingIds(req)
    
    if (ids.length > 100) {
      const payload = serializeRequest(req)
      await workers[fn.name](payload)
    } else {
      await fn(req, getCurrentBrand())
    }
  }
}

function serializeRequest(req) {
  return {
    brand: getCurrentBrand(),
    user: req.user.id,
    params: req.params,
    query: req.query,
    body: req.body
  }
}

function workerizedHandler(fn) {
  async function handler(payload) {
    const req = {
      user: await User.get(payload.user),
      query: payload.query,
      body: payload.body,
      params: payload.params
    }

    await fn(req, payload.brand)
  }

  return handler
}

module.exports = {
  registerWorker,
  workerize,
}
