const { Transform } = require('stream')

let counter = 0

class PeanarWorker extends Transform {
  /**
   * @param {import('./app')} app 
   */
  constructor(app) {
    super({
      objectMode: true
    })

    this.app = app
    this.n = counter++
  }

  /**
   * @param {import('./job')} job 
   */
  async run(job) {
    this.app.log(`PeanarWorker#${this.n}: run(${JSON.stringify(job, null, 2)})`)

    try {
      const result = await job.perform()

      this.push({
        status: 'SUCCESS',
        result
      })
    } catch (ex) {
      console.error(ex)
      this.push({
        status: 'FAILURE',
        ex
      })
    }
  }

  /**
   * @param {import('./job')} job 
   * @param {string} _encoding 
   * @param {import('stream').TransformCallback} cb 
   */
  _transform(job, _encoding, cb) {
    this.run(job).nodeify(cb)
  }
}

module.exports = PeanarWorker
