const debug = require('debug')('rechat:workers:csvimport')

const _ = require('lodash')
const kue = require('kue')
const moment = require('moment')
const Papa = require('papaparse')

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
 * 
 * @param {ReadableStream} stream 
 * @param {Record<string, ICSVImporterMappedField>} mappedFields 
 * @param {IContactAttributeDef[]} defs 
 * @returns {Promise<IContactInput[]>}
 */
function parse(stream, mappedFields, defs) {
  /** @type {IContactInput[]} */
  const contacts = []
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs, 'name')

  return new Promise(function(resolve, reject) {
    Papa.parse(stream, {
      header: true,
      step(results, parser) {
        const row = results.data[0]

        /** @type {IContactInput} */
        const contact = {
          attributes: []
        }
  
        _.each(mappedFields, ({ attribute_def: def_id, label, index = 0 }, csvField) => {
          if (!def_id) {
            debug(`WARN: No attribute_def specified in mapping for column ${csvField}.`)
            return true
          }
    
          const def = defs_by_id[def_id]

          const fieldValue = row[csvField]
          if (!fieldValue) {
            debug(`WARN: No value for mapping on ${csvField}.`)
            return true
          }
    
          const parsedValue = parseValue(
            csvField,
            def,
            fieldValue.toString().trim()
          )
    
          if (parsedValue === null) {
            debug(`WARN: Parsed value is null for column ${csvField}.`)
            return true
          }
    
          /** @type {IContactAttributeInput} */
          const attr = {
            attribute_def: def_id,
            [def.data_type]: parsedValue
          }
    
          if (label) {
            attr.label = label
          }

          if (def.section === 'Addresses')
            attr.index = index + 1
    
          contact.attributes.push(attr)
        })
    
        contact.attributes.push({
          attribute_def: defs_by_name['source_type'].id,
          text: 'CSV'
        })

        contacts.push(contact)
      },
  
      complete() {
        resolve(contacts)
      },

      error(error) {
        reject(error)
      }
    })
  })
}

/**
 * @param {kue.Job} job 
 */
async function import_csv(job) {
  const user_id = job.data.user_id
  const file_id = job.data.file_id

  /** @type {Record<string, ICSVImporterMappedField>} */
  const mappedFields = job.data.mappings

  const stream = await AttachedFile.downloadAsStream(file_id)

  debug('Created S3 stream...')

  const def_ids = await AttributeDef.getForUser(user_id)
  const defs = await AttributeDef.getAll(def_ids)
  
  const contacts = await parse(stream, mappedFields, defs)

  debug('Read the CSV file...')

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