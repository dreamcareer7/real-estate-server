const path = require('path')
const fs = require('fs')
const mappings = require('./data/csv_mappings')

registerSuite('contact', [
  'brandCreateParent',
  'brandCreate',
  'getAttributeDefs'
])

function uploadCSV(cb) {
  const csv = fs.createReadStream(path.resolve(__dirname, 'data/contacts.csv'))

  return frisby.create('upload a CSV file')
    .post('/contacts/upload', {
      file: csv
    },
    {
      json: false,
      form: true
    })
    .addHeader('content-type', 'multipart/form-data')
    .after((err, res, body) => {
      cb(err, {...res, body: JSON.parse(body)}, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

function importCSV(cb) {
  const data = {
    file_id: results.contact_import.uploadCSV.data.id,
    mappings
  }
  
  return frisby.create('import contacts from CSV file')
    .post('/contacts/import.csv', data)
    .after(cb)
    .expectStatus(200)
}

function getContacts(cb) {
  return frisby.create('check if contacts all contacts are imported')
    .get('/contacts?limit=1')
    .after(cb)
    .expectJSON({
      info: {
        total: 192
      }
    })
    .expectStatus(200)
}

module.exports = {
  uploadCSV,
  importCSV,
  getContacts
}