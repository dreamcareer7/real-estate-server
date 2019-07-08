class PeanarRPC {
  constructor() {
    /** @type {Map<string, { resolve(res: any): void, reject(err: any): void }>} */
    this.promises = new Map()
  }

  _setupConsumers() {

  }
}

module.exports = PeanarRPC
