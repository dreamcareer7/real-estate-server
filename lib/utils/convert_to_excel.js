const exjs = require('exceljs')
const _ = require('lodash')
const moment = require('moment-timezone')
const csvWriter = require('csv-write-stream')

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
    // Javad-TODO: Continue from here to build a better excel representation
    // tmp.repititions = 1
    tmp.rowName = obj.value
    tmp.format = obj.format
    this.rules.push(tmp)
    // this.headers.push(obj.headerName)
    return this
  }

  prepare() {
    if (this.prepareCalled) {
      return
    }
    this.prepareCalled = true

    let headersAdded = false
    this.collection.forEach(c => {
      const cells = []
      this.rules.forEach(r => {
        if (!headersAdded) {
          this.headers.push(r.headerName)
        }
        // To prevent calling an undefined value
        const format = r.format || _.identity
        if (!_.isNil(r.rowName) && _.isFunction(r.rowName)) {
          cells.push(format(r.rowName(c) || ''))
        } else {
          cells.push(format(c[r.rowName] || ''))
        }
      })
      this.rows.push(cells)
      headersAdded = true
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

class VariableHeaderEntityToTable extends EntityToExcel {
  constructor(collection, columnSpecification) {
    super(collection)
    if (!_.isObject(columnSpecification)) {
      throw new Error('Column specification object is not valid')
    }
    this.columnSpecification = columnSpecification
  }
  
  prepare() {
    if (this.prepareCalled) {
      return
    }
    this.prepareCalled = true
    let headersDone = false
    this.collection.forEach( (contact) => {
      const currentRow = []
      for (const spec of this.columnSpecification) {
        
        for (let i = 0; i < spec.size; i++) {
          if (!headersDone) {
            const number = spec.size > 1 ? ` ${i + 1}` : ''
            this.headers.push(spec.header + number)
          }
          if (Array.isArray(spec.value)) {
            if (!headersDone) {
              this.headers.splice(-1, 1)
            }
            for (let j = 0; j < spec.value.length; j++) {
              if (!headersDone) {
                const number = spec.size > 1 ? ` ${i + 1}` : ''
                this.headers.push(spec.header[j] + number)
              }
              currentRow.push(spec.value[j](contact, i))
            }
          } else {
            currentRow.push(spec.value(contact, i))
          }
        }
      }
      headersDone = true
      this.rows.push(currentRow)
    })
    
    return this
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
function convert(inData, fileOrStream, extention = 'xlsx') {
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
    return workbook[extention].writeFile(fileOrStream)
  }
  // write to a stream and return promise
  return workbook[extention].write(fileOrStream)
}

function writeCSVToStream(inData, stream) {
  return new Promise((res, rej) => {
    const writer = csvWriter({ headers: inData.columns})
    writer.pipe(stream)
    for (const item of inData.rows) { 
      writer.write(item)
    }
    writer.end(res)
  })
}

function writeCSVToStreamWithIndependentHeaders(rows, headers, stream) {
  return new Promise((res, rej) => {
    const writer = csvWriter({ headers })
    writer.pipe(stream)

    for (const item of rows) {
      const date_keys = Object.keys(item).filter(k => _.isDate(item[k]))
      const modified = {...item}
      for (const k of date_keys) {
        modified[k] = moment(item[k]).format('LL')
      }
      writer.write(Object.values(modified))
    }
    writer.end(res)
  })
}

module.exports = {
  convert,
  EntityToExcel,
  writeCSVToStream,
  writeCSVToStreamWithIndependentHeaders,
  VariableHeaderEntityToTable
}