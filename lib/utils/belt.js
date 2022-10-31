const _ = require('lodash')

/**
 * Converts epoch timestamp to Date object
 * @param {number} epoch Epoch timestamp in seconds
 * @returns {Date} Date equivalent of epoch
 */
function epochToDate(epoch) {
  return new Date(epoch * 1000)
}

/**
 * Converts to Date object epoch timestamp
 * @param {Date} date A Date object
 * @returns {number} Epoch timestamp equivalent of the date object
 */
function dateToEpoch(date) {
  return date.getTime() / 1000
}

/**
 * Maps in series with async/await
 * @param {any[]} arr
 * @param {(any) => any} fn
 */
async function asyncMap(arr, fn) {
  const result = []
  for (const item of arr) {
    result.push(await fn(item))
  }

  return result
}

function isIterable(obj) {
  // checks for null and undefined
  if (obj === null || obj === undefined) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}

function ensureFields(obj, fields, defaults = {}, formatters = {}) {
  for (const k of fields) {
    if (obj[k] === undefined) {
      obj[k] = (defaults[k] === undefined ? null : defaults[k])
    }

    if (typeof formatters[k] === 'function') {
      obj[k] = formatters[k](obj[k])
    }
  }

  for (const k of _.difference(Object.keys(obj), fields)) {
    delete obj[k]
  }

  return obj
}

/**
 * @template O
 * @param {O} obj
 * @returns {O}
 */
function deepFreeze (obj) {
  _.forOwn(obj, Object.freeze)
  return Object.freeze(obj)
}

/**
 * @param {IArguments | any[]} args
 * @param {any=} [thiz]
 * @param {(string | null | undefined)=} [fn]
 * @param {((s: string) => any)=} [log]
 */
function footprint (args, thiz, fn, log) {
  log || (log = function log (str) {
    try {
      require('../models/Context').log(str)
    } catch (err) {
      console.error(err)
      console.log(str)
    }
  })

  const ctx = thiz ? `[${thiz.constructor?.name || '[Object]'}].` : ''
  const argsStr = [...args].map(a => JSON.stringify(a)).join(', ')

  log(`Footprint: ${ctx}${fn}(${argsStr})`)
}

/**
 * @param {function} fn
 * @returns {number}
 */
function measureTime (fn) {
  const { performance } = require('perf_hooks')
  const now = performance.now.bind(performance)

  const t0 = now()
  fn()
  const t1 = now()

  return t1 - t0
}

/**
 * @param {string[]} array
 * @param {boolean} [trim=true]
 * @returns {string[]}
 */
function uniqCaseInsensitive (array, trim = true) {
  if (trim) {
    array = array.map(item => String(item).trim())
  }

  return _.uniqBy(array, item => String(item).toLowerCase())
}

module.exports = {
  epochToDate,
  dateToEpoch,
  asyncMap,
  isIterable,
  ensureFields,
  deepFreeze,
  footprint,
  measureTime,
  uniqCaseInsensitive,
}
