const async = require('async')
const environments = require('./environments')
const { RENDER, DESTROY, SUCCESS, ERROR } = require('./actions')

const timeout = mils => {
  return new Promise(resolve => {
    setTimeout(resolve, mils)
  })
}

const render = async message => {
  const { renderer, args, id } = message

  if (!environments[renderer])
    throw new Error.Generic(`Unknown renderer ${renderer}`)

  try  {
    const result = environments[renderer].call(null, ...args)
    process.send({
      action: SUCCESS,
      result
    })
  } catch(error) {
    console.log(error)
    process.send({
      action: ERROR,
      error
    })
  }
}

const destroy = worker => {
  console.log('DESTROYING')
  process.exit()
}

const actions = {}
actions[RENDER] = render
actions[DESTROY] = destroy

process.on('message', message => {
  const { action } = message

  if (!actions[action])
    throw new Error.Generic(`Unknown worker action ${action}`)


  actions[action](message)
})
