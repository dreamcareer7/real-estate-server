const Context = require('../Context')

const counters = {}

const send = (params, cb) => {
  const suite = Context.get('suite') || 'DEFAULT'

  if (!counters[suite])
    counters[suite] = 0

  const id = `example-mailgun-id-${suite}-${counters[suite]++}`

  cb(null, { id })
}

const messages = () => {
  return { send }
}

const Attachment = function() {

}

const instance = {
  messages,
  Attachment
}

module.exports = instance

