const { fork } = require('child_process')
const Pool = require('generic-pool')
const { expect } = require('chai')
const environments = require('./environments')
const { cpus } = require('os')

const {
  DESTROY,
  RENDER,
  SUCCESS,
  ERROR,
  VALIDATE,
  VALIDATE_RESULT
} = require('./actions')

const create = async () => {
  return fork(`${__dirname}/worker`)
}

const destroy = async worker => {
  worker.message({action: DESTROY})
}

const validate = async worker => {
  return new Promise((resolve, reject) => {
    worker.once('message', async message => {
      const { action } = message

      if (action === VALIDATE_RESULT) {
        resolve(true)
        return
      }

      throw new Error.Generic(`Unknown validate response ${action}`)
    })

    worker.send({
      action: VALIDATE
    })
  })
}

const pool = Pool.createPool({create, destroy, validate}, {
  min: 1,
  max: cpus().length + 1,
  autostart: true
})

const isolate = name => {
  return (...args) => {
    return new Promise(async (resolve, reject) => {
      const worker = await pool.acquire()

      worker.once('message', async message => {
        const { action } = message

        if (action === SUCCESS) {
          const { result } = message
          await pool.release(worker)
          resolve(result)
          return
        }

        if (action === ERROR) {
          const { error } = message
          await pool.release(worker)
          reject(error)
          return
        }

        await pool.release(worker)
        throw new Error.Generic(`Unknown response action ${action}`)
      })

      worker.send({
        action: RENDER,
        renderer: name,
        args
      })
    })
  }
}

const isolated = () => {
  const isolated = {}

  for(const key in environments)
    isolated[key] = isolate(key)

  return isolated
}

module.exports = {
  ...environments,
  isolated: isolated()
}
