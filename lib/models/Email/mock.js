let counter = 1

const send = (params, cb) => {
  const suite = Context.get('suite')
  const id = `example-mailgun-id-${suite}-${counter++}`

  console.log('GEN ID', id)
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

