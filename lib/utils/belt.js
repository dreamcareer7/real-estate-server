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

module.exports = {
  epochToDate,
  dateToEpoch,
}
