const Domain = require('domain')
const uuid = require('node-uuid')
const numeral = require('numeral')

Context = {}

Context.create = ({_id, _created_at} = {}) => {
  const id = _id || uuid.v1()
  const created_at = _created_at || process.hrtime()

  const domain = Domain.create()

  const on = domain.on.bind(domain)
  const emit = domain.emit.bind(domain)

  let data = {}

  const enter = () => {
    domain.enter()
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

  const log = (...args) => {
    const e = numeral(elapsed()).format('0,0') + 'ms'

    console.log.apply(this, [
      id.green,
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
    created_at,
    enter,
    watchOver,
    run,
    on,
    emit,
    log,
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

  console.trace.apply(this, ['<No-Context>', ...args])
}