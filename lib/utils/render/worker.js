const environments = require('./environments')
const { RENDER, PAYLOAD, ERROR, FINISH } = require('./actions')

const render = async message => {
  const { template, contexts } = message

  const compiled = environments.compileHtml(template)

  const item = ctx => {
    try  {
      const result = compiled.render(ctx)

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

  while(contexts.length) {
    const context = contexts.shift()
    process.nextTick(item.bind(null, context))
  }

  process.nextTick(() => {
    process.send({
      action: FINISH
    })
  })
}

const actions = {}
actions[RENDER] = render

process.on('message', message => {
  const { action } = message

  if (!actions[action])
    throw new Error.Generic(`Unknown worker action ${action}`)


  actions[action](message)
})
