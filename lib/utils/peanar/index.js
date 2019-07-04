const Peanar = require('./app')

const peanar = new Peanar()

if (process.env.NODE_ENV === 'tests') {
  const queues = require('../../../scripts/queues.js')

  /**
   * @param {(...args: any[]) => Promise<any>} fn
   */
  peanar.job = (fn) => {
    fn.immediate = fn

    return fn
  }
}

module.exports = { peanar }
