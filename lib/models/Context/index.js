Context = {}

Context.id = () => {
  const domain = process.domain

  if (!domain)
    return '<No-Context>'

  return domain.id || '<No-Id>'
}

Context.log = (...args) => {
  console.log.apply(this, [
    Context.id().green,
    ...args
  ])
}

Context.trace = (...args) => {
  console.trace.apply(this, [
    Context.id().green,
    ...args
  ])
}