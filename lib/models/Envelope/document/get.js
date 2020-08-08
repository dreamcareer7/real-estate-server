const db = require('../../../utils/db')

const get = (id, cb) => {
  getAll([id], (err, documents) => {
    if(err)
      return cb(err)

    if (documents.length < 1)
      return cb(Error.ResourceNotFound('Envelope document' + id + ' not found'))

    const document = documents[0]

    return cb(null, document)
  })
}

const getAll = (document_ids, cb) => {
  db.query('envelope/document/get', [document_ids], (err, res) => {
    if (err)
      return cb(err)

    const documents = res.rows

    return cb(null, documents)
  })
}

module.exports = {
  get,
  getAll
}
