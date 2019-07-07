class PeanarJob {
  /**
   * @param {import('./peanar').IPeanarJob} req
   */
  constructor(req) {
    this.id = req.id
    this.name = req.name
    this.args = req.args
    this.correlationId = req.correlationId || req.id
    this.queue = req.queue
    this.replyTo = req.replyTo

    this.handler = req.handler
  }

  async perform() {
    return await this.handler.apply(null, this.args)
  }
}

module.exports = PeanarJob
