const { html, text } = require('./environments')
const nunjucks = require('nunjucks')

const { RENDER, PAYLOAD, ERROR, COMPILE, HTML, TEXT, COMPILE_RESULT } = require('./actions')

let compiled

const types = {}
types[HTML] = html
types[TEXT] = text

const compile = async message => {
  const { template, type } = message

  const env = types[type]
  if (!env) {
    process.send({
      action: COMPILE_RESULT,
      error: `Unknown render type ${type}`
    })
  }

  try {
    compiled = nunjucks.compile(template, env)

    /*
     * Without calling the compile function, the compiling
     * is actually deferred to later. But we need to know if it's a valid
     * template or not at this point.
     * By calling compile now, nunjucks will parse the template
     * and throw error if it's invalid
     */
    compiled.compile()

    process.send({
      action: COMPILE_RESULT,
    })
  } catch(error) {
    process.send({
      action: COMPILE_RESULT,
      error: 'Error during compilation'
    })
  }
}

const render = async message => {
  const { context } = message

  try  {
    const result = compiled.render(context)

    process.send({
      action: PAYLOAD,
      result
    })
  } catch(error) {
    process.send({
      action: ERROR,
      error
    })
  }
}


const actions = {}
actions[RENDER] = render
actions[COMPILE] = compile

process.on('message', message => {
  const { action } = message

  if (!actions[action])
    throw new Error.Generic(`Unknown worker action ${action}`)


  actions[action](message)
})
