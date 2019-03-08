let counter = 1

const send = (params, cb) => {
  const id = `example-mailgun-id-${counter++}`

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

