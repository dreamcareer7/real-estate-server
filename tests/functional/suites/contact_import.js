const path = require('path')
const fs = require('fs')
const mappings = require('./data/csv_mappings')

global.registerSuite('contact', [
  'getAttributeDefs'
])

const CSV_PATH = path.resolve(__dirname, 'data', 'contacts.csv')
const XLS_PATH = path.resolve(__dirname, 'data', 'contacts.xls')
const XLSX_PATH = path.resolve(__dirname, 'data', 'contacts.xlsx')
const NROWS = 192

const R = () => global.results
const F = global.frisby

const resolve = x => typeof x === 'function' ? x() : x
const the = {
  userId: () => R().authorize.token.data.id,
  csvFileId: () => R().contact_import.uploadCSV.data.id,
  xlsFileId: () => R().contact_import.uploadXls.data.id,
  xlsxFileId: () => R().contact_import.uploadXlsx.data.id,
}

/**
 * @param {import('fs').ReadStream} stream
 * @param {string} name
 */
function upload (stream, name) {
  return cb => F
    .create(name)
    .post('/contacts/upload', { file: stream }, { json: false, form: true })
    .addHeader('content-type', 'multipart/form-data')
    .after((err, res, body) => cb(err, {...res, body: JSON.parse(body)}, body))
    .expectStatus(200)
    .expectJSON({ code: 'OK' })
}

/**
 * @param {object} opts
 * @param {UUID | (() => UUID)} opts.fileId
 * @param {UUID | (() => UUID)} opts.ownerId
 * @param {string | (() => string)} opts.ext
 * @param {string} opts.name
 */
function importFile ({ fileId, ownerId, ext, name }) {
  return cb => F
    .create(name)
    .post(`/contacts/import.${resolve(ext)}`, {
      file_id: resolve(fileId),
      owner: resolve(ownerId),
      mappings,
    })
    .after(cb)
    .expectStatus(200)
}

/**
 * @param {number} expectedTotal
 * @param {string=} [name]
 */
function checkContacts(
  expectedTotal,
  name = `check if ${expectedTotal} contacts are imported`,
) {
  return cb => F
    .create(name)
    .get('/contacts?limit=1')
    .expectJSON({
      info: {
        total: expectedTotal
      }
    })
    .after(cb)
    .expectStatus(200)
}

/**
 * Delete all existing contacts
 * @param {string=} [name]
 */
function clearContacts (name = 'delete all contacts') {
  return cb => F
    .create(name)
    .delete('/contacts')
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  uploadXls: upload(fs.createReadStream(XLS_PATH), 'upload a XLS file'),
  importXls: importFile({
    name: 'import contacts from XLS file',
    fileId: the.xlsFileId,
    ownerId: the.userId,
    ext: 'xls',
  }),
  getContactsXls: checkContacts(NROWS),
  clearContactsXls: clearContacts(),
  
  uploadXlsx: upload(fs.createReadStream(XLSX_PATH), 'upload a XLSX file'),
  importXlsx: importFile({
    name: 'import contacts from XLSX file',
    fileId: the.xlsxFileId,
    ownerId: the.userId,
    ext: 'xlsx',
  }),
  getContactsXlsx: checkContacts(NROWS),
  clearContactsXlsx: clearContacts(),
  
  uploadCSV: upload(fs.createReadStream(CSV_PATH), 'upload a CSV file'),
  importCSV: importFile({
    name: 'import contacts from CSV file',
    fileId: the.csvFileId,
    ownerId: the.userId,
    ext: 'csv',
  }),
  getContacts: checkContacts(NROWS),
  // keep imported contacts. maybe usable in another test:
  // clearContactsCsv: clearContacts(),
}
