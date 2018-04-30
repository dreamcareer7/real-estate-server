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

module.exports = {
  epochToDate,
  dateToEpoch,
  asyncMap,
  isIterable,
}
