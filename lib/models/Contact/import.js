const debug = require('debug')('rechat:workers:csvimport')

const _ = require('lodash')
const kue = require('kue')
const moment = require('moment')
const Excel = require('exceljs')

const AttachedFile = require('../AttachedFile')

const Contact = require('./index')
const AttributeDef = require('./attribute_def')

function parseValue(csvField, def, value) {
  if (def.name === 'phone_number') {
    return value && value.replace(/\s/g, '').replace(/^00/, '+')
  }

  if (def.data_type === 'date') {
    return value && moment(value).isValid() ? moment(value).unix() : null
  }

  if (def.name === 'note') {
    return `${csvField}: ${value}`
  }

  return value
}

/**
 * @param {kue.Job} job 
 */
async function import_csv(job) {
  const user_id = job.data.user_id
  const file_id = job.data.file_id

  /** @type {Record<string, ICSVImporterMappedField>} */
  const mappedFields = job.data.mappings

  /** @type {Buffer} */
  const stream = await AttachedFile.downloadAsStream(file_id)

  const workbook = new Excel.Workbook()
  
  debug('Created S3 stream...')

  const sheet = await workbook.csv.read(stream)

  debug('Read the CSV file...')

  const def_ids = await AttributeDef.getForUser(user_id)
  const defs = await AttributeDef.getAll(def_ids)
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs, 'name')

  /** @type {IContactInput[]} */
  const contacts = []

  sheet.eachRow((row, i) => {
    /** @type {IContactInput} */
    const contact = {
      attributes: []
    }

    _.each(mappedFields, ({ def_id, label, index = 0 }, csvField) => {
      if (!def_id) {
        return false
      }

      const def = defs_by_id[def_id]

      const cell = row.getCell(csvField)
      if (!cell.value) {
        return false
      }

      const fieldValue = cell.value.toString().trim()

      const parsedValue = parseValue(
        csvField,
        def,
        fieldValue
      )

      if (parsedValue === null) {
        return false
      }

      /** @type {IContactAttributeInput} */
      const attr = {
        attribute_def: def_id,
        [def.data_type]: parsedValue
      }

      if (label) {
        attr.label = label
      }

      attr.index = index + 1

      contact.attributes.push(attr)
    })

    contact.attributes.push({
      attribute_def: defs_by_name['source_type'].id,
      text: 'CSV'
    })

    contacts.push(contact)
  })

  debug('Preparation completed...')

  const result = await import_json({ user_id, contacts })

  debug('Created the contacts...')

  return result
}

function import_json(job) {
  return Contact.create(job.user_id, job.contacts, {
    activity: false,
    relax: true,
    get: false
  })
}

module.exports = {
  import_csv,
  import_json
}