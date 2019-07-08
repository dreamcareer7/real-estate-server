const { Transform } = require('stream')

let counter = 0

class PeanarWorker extends Transform {
  /**
   * @param {import('./app')} app
   * @param {import('ts-amqp/dist/classes/ChannelN').default} channel
   */
  constructor(app, channel) {
    super({
      objectMode: true
    })

    this.app = app
    this.channel = channel
    this.n = counter++
  }

  /**
   * @param {import('./job')} job
   */
  async run(job) {
    this.app.log(
      `PeanarWorker#${this.n}: run()`
    )

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
    } finally {
      job.ack()
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
