const { fork } = require('child_process')
const { html, text } = require('./environments')
const { expect } = require('chai')

const {
  RENDER,
  PAYLOAD,
  ERROR,
  COMPILE,
  HTML,
  TEXT,
  COMPILE_RESULT
} = require('./actions')

const compile = (type, template) => {
  return new Promise((resolve, reject) => {
    const worker = fork(`${__dirname}/worker`)

    const release = () => {
      worker.kill('SIGKILL')
    }

    const render = context => {
      return new Promise((resolve, reject) => {
        worker.once('message', message => {
          const { action } = message

          if (action === PAYLOAD) {
            const { result } = message
            resolve(result)
            return
          }

          if (action === ERROR) {
            const { error } = message
            reject(error)
            return
          }
        })

        worker.send({
          action: RENDER,
          context
        })
      })
    }

    worker.once('message', message => {
      const { action, error } = message

      expect(action).to.equal(COMPILE_RESULT)

      if (error) {
        release()
        reject(Error.Validation(error))
        return
      }

      resolve({render, release})
    })

    worker.send({
      action: COMPILE,
      template,
      type
    })
  })
}

const compileHtml = template => {
  return compile(HTML, template)
}

const compileText = template => {
  return compile(TEXT, template)
}

module.exports = {
  html: html.render.bind(html),
  htmlString: html.renderString.bind(html),
  compileHtml,

  text: text.render.bind(text),
  textString: text.renderString.bind(text),
  compileText
}
