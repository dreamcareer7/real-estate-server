const { fork } = require('child_process')
const environments = require('./environments')

const {
  RENDER,
  PAYLOAD,
  ERROR,
  FINISH
} = require('./actions')

const destroy = worker => {
  worker.kill('SIGKILL')
}


const htmlStrings = (template, contexts) => {
  return new Promise(async (resolve, reject) => {
    const worker = fork(`${__dirname}/worker`)
    const results = []

    worker.on('message', async message => {
      const { action } = message

      if (action === PAYLOAD) {
        const { result } = message
        results.push(result)
        return
      }

      if (action === FINISH) {
        destroy(worker)
        resolve(results)
        return
      }

      if (action === ERROR) {
        const { error } = message
        destroy(worker)
        reject(error)
        return
      }

      destroy(worker)
      throw new Error.Generic(`Unknown response action ${action}`)
    })

    worker.send({
      action: RENDER,
      template,
      contexts
    })
  })
}

module.exports = {
  ...environments,
  htmlStrings
}
