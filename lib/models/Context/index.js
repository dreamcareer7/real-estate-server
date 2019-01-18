require('colors')
const Domain = require('domain')
const uuid = require('node-uuid')
const numeral = require('numeral')

const Context = {}

Context.create = ({id, created_at, logger} = {}) => {
  id = id || uuid.v1()
  created_at = created_at || process.hrtime()

  const domain = Domain.create()

  const on = domain.on.bind(domain)
  const emit = domain.emit.bind(domain)

  let data = {}

  const enter = () => {
    domain.enter()
  }

  const exit = () => {
    domain.exit()
  }

  const run = fn => {
    domain.run(fn)
  }

  const watchOver = emitter => {
    domain.add(emitter)
  }

  const elapsed = () => {
    const [seconds, nanoseconds] = process.hrtime(created_at)
    const e = Math.round((seconds * 1000) + (nanoseconds * 1e-6))

    return e
  }

  const _logger = (...args) => {
    const e = numeral(elapsed()).format('0,0') + 'ms'

    console.log.apply(this, [
      id.green,
      e,
      ...args
    ])
  }

  const log = logger ? logger : _logger

  const error = (...args) => {
    const e = numeral(elapsed()).format('0,0') + 'ms'

    console.error.apply(this, [
      id.red,
      e,
      ...args
    ])
  }

  const trace = (...args) => {
    const e = numeral(elapsed()).format('0,0') + 'ms'

    console.trace.apply(this, [
      id.green,
      e,
      ...args
    ])
  }

  const get = key => {
    return data[key]
  }

  const set = attrs => {
    data = {
      ...data,
      ...attrs
    }
  }

  const unset = key => {
    delete data[key]
  }

  const context = {
    id,
    domain,
    created_at,
    elapsed,
    enter,
    exit,
    watchOver,
    run,
    on,
    emit,
    log,
    error,
    trace,
    get,
    set,
    unset
  }

  domain.context = context

  return context
}

Context.set = attrs => {
  const active = Context.getActive()
  if(!active)
    return

  active.set(attrs)
}

Context.unset = key => {
  const active = Context.getActive()
  if(!active)
    return

  active.unset(key)
}

Context.get = key => {
  const active = Context.getActive()
  if(!active)
    return

  return active.get(key)
}

Context.getActive = () => {
  if (!process.domain)
    return false

  return process.domain.context
}

Context.trace = (...args) => {
  const active = Context.getActive()
  if (active)
    return active.trace.apply(this, args)

  console.log.apply(this, ['<No-Context>', ...args])
}

Context.log = (...args) => {
  const active = Context.getActive()
  if (active)
    return active.log.apply(this, args)

  console.log.apply(this, ['<No-Context>', ...args])
}

Context.error = (...args) => {
  const active = Context.getActive()
  if (active)
    return active.error.apply(this, args)

  console.error.apply(this, ['<No-Context>', ...args])
}

Context.emit = (...args) => {
  const active = Context.getActive()
  if (!active)
    throw new Error('No Active Context Found')

  active.emit.apply(null, args)
}

Context.exit = () => {
  const active = Context.getActive()
  if (!active)
    throw new Error('No Active Context Found')

  active.exit()
}

module.exports = Context
global['Context'] = Context
