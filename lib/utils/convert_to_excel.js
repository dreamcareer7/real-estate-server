const exjs = require('exceljs')
const lo = require('lodash')

class EntityToExcel {
  constructor(collection) {
    this.rules = []
    this.headers = []
    this.rows = []
    this.collection = collection
    this.prepareCalled = false
  }

  add(obj) {
    if (this.prepareCalled) {
      return
    }
    const tmp = {}
    tmp.headerName = obj.headerName
    tmp.repititions = 1
    tmp.rowName = obj.value
    tmp.format = obj.format
    this.rules.push(tmp)
    this.headers.push(obj.headerName)
    return this
  }

  prepare() {
    if (this.prepareCalled) {
      return
    }
    this.prepareCalled = true

    this.collection.forEach(c => {
      const cells = []
      this.rules.forEach(r => {
        const format = r.format || lo.identity
        if (lo.isFunction(r.rowName)) {
          cells.push(format(r.rowName(c)))
        } else {
          cells.push(format(c[r.rowName]))
        }

      })
      this.rows.push(cells)
    })
  }

  getRows() {
    this.prepare()
    return this.rows
  }

  getHeaders() {
    this.prepare()
    return this.headers
  }

}


/***
 * The function converts a Javascript object to excel
 * @param {object} inData An object consisting of data that should be exported is following format:
 * {
 *    columns: ['header 1', 'h2', 'h3', 'h4'],
 *    rows: [
 *      ['val 1', 'val 2', 'val 3', 'val 4'],
 *      ['another val 1', 'another val 2', 'another val 3', 'another val 4']
 *    ]
 * }
 * @returns {stream} Excel file stream to be piped to any write stream
 */
function convert(inData, fileOrStream) {
  const DEFAULT_COLUMN_WIDTH = 32
  const MAKE_HEADERS_BOLD = true
  const HEADER_FONT_SIZE = 14

  const workbook = new exjs.Workbook()
  const worksheet = workbook.addWorksheet('My Sheet')

  const columns = []
  inData.columns.forEach(c => {
    const obj = {
      header: c,
      key: c.toLowerCase(),
      width: DEFAULT_COLUMN_WIDTH,
    }
    columns.push(obj)
  })
  worksheet.columns = columns
  worksheet.getRow(1).font = {bold: MAKE_HEADERS_BOLD, size: HEADER_FONT_SIZE}
  worksheet.addRows(inData.rows)

  if (typeof fileOrStream === 'string') {
    // write to a file and return promise
    return workbook.xlsx.writeFile(fileOrStream)
  }
  // write to a stream and return promise
  return workbook.xlsx.write(fileOrStream)

}


module.exports = {
  convert,
  EntityToExcel
}