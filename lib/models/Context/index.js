const Domain = require('domain')
const uuid = require('node-uuid')
const numeral = require('numeral')

Context = {}

Context.create = ({id, created_at} = {}) => {
  const domain = Domain.create()

  domain.id = id || uuid.v1()
  domain.created_at = created_at || process.hrtime()

  return domain
}

Context.id = () => {
  const domain = process.domain

  if (!domain)
    return '<No-Context>'

  return domain.id || '<No-Id>'
}

Context.elapsed = () => {
  if (!process.domain)
    return 0

  const [seconds, nanoseconds] = process.hrtime(process.domain.created_at)
  const elapsed = Math.round((seconds * 1000) + (nanoseconds * 1e-6))

  return elapsed
}

Context.log = (...args) => {
  const elapsed = numeral(Context.elapsed()).format('0,0') + 'ms'

  console.log.apply(this, [
    Context.id().green,
    elapsed,
    ...args
  ])
}

Context.trace = (...args) => {
  console.trace.apply(this, [
    Context.id().green,
    ...args
  ])
}