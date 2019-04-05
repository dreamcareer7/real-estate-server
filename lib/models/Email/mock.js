const send = (params, cb) => {
  const id = 'example-mailgun-id'

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

