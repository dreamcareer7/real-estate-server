const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')
const mappings = require('./data/csv_mappings')

registerSuite('contact', [
  'getAttributeDefs'
])

const CSV_PATH = path.resolve(__dirname, 'data', 'contacts.csv')
const CSV_ROWS = 192

const R = () => results
const F = frisby

const resolve = x => typeof x === 'function' ? x() : x
const the = {
  userId: () => R().authorize.token.data.id,
  csvFileId: () => R().contact_import.uploadCSV.data.id,
  xlsFileId: () => R().contact_import.uploadXls.data.id,
  xlsxFileId: () => R().contact_import.uploadXlsx.data.id,
}

/**
 * @param {xlsx.BookType} bookType
 * @returns {import('stream').Readable}
 */
function createWorkbook (bookType) {
  const wb = xlsx.readFile(CSV_PATH)
  const buff = xlsx.write(wb, { type: 'buffer', bookType })

  // XXX Why this is not working?! maybe Frisby does not support Readable Streams
  // return require('stream').Readable.from(buff)

  const fileName = `rechat-test-contact-import.${bookType}`
  const filePath = path.resolve(require('os').tmpdir(), fileName)
  fs.writeFileSync(filePath, buff)
  return fs.createReadStream(filePath)
}

/**
 * @param {import('stream').Readable} readable 
 * @param {string} name 
 */
function upload (readable, name) {
  return cb => F
    .create(name)
    .post('/contacts/upload', { file: readable }, { json: false, form: true })
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

module.exports = {
  uploadCSV: upload(fs.createReadStream(CSV_PATH), 'upload a CSV file'),
  importCSV: importFile({
    name: 'import contacts from CSV file',
    fileId: the.csvFileId, 
    ownerId: the.userId, 
    ext: 'csv', 
  }),
  getContacts: checkContacts(CSV_ROWS),

  uploadXls: upload(createWorkbook('xls'), 'upload a XLS file'),
  importXls: importFile({
    name: 'import contacts from XLS file',
    fileId: the.xlsFileId,
    ownerId: the.userId,
    ext: 'xls',
  }),
  getContactsXls: checkContacts(CSV_ROWS * 2),

  uploadXlsx: upload(createWorkbook('xlsx'), 'upload a XLSX file'),
  importXlsx: importFile({
    name: 'import contacts from XLSX file',
    fileId: the.xlsxFileId,
    ownerId: the.userId,
    ext: 'xlsx',
  }),
  getContactsXlsx: checkContacts(CSV_ROWS * 3),
}
