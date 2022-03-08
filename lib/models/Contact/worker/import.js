const format = require('util').format
const Activity = require('../../Activity/add')
const Context = require('../../Context')

const _ = require('lodash')
const path = require('path')
const moment = require('moment')
const excel = require('exceljs')
const Papa = require('papaparse')
const addressParser = require('parse-address')

const promisify = require('../../../utils/promisify')
const { strict: assert } = require('assert')
const expect = require('../../../utils/validator').expect
const { peanar } = require('../../../utils/peanar')

const AttachedFile = require('../../AttachedFile')
const Slack = require('../../Slack')
const User = require('../../User/get')
const Brand = require('../../Brand/get')

const Contact = require('../index')
const AttributeDef = require('../attribute_def/get')
const { setActivityReference } = require('../activity')

const { sendFailureSocketEvent, sendSuccessSocketEvent } = require('./socket')

/** @typedef {any} AttachedFile */

const SOCKET_EVENT = 'contact:import'

// @ts-ignore
Papa.LocalChunkSize = 100 * 1024 // 100KB
// @ts-ignore
Papa.RemoteChunkSize = 100 * 1024 // 100KB

/**
 * @param {IBrand['id']} brandId
 * @param {Record<string, ICSVImporterMappingDef>} mapping_defs
 */
async function prepareMappingDefs (brandId, mappingDefs) {
  const defIds = await AttributeDef.getForBrand(brandId)
  const defs = await AttributeDef.getAll(defIds)
  const defsById = _.keyBy(defs, 'id')
  const defsByName = _.keyBy(defs, 'name')

  function getDef ({ attribute_type, attribute_def }, csvField) {
    if (attribute_type === 'full_address') return { name: 'full_address' }
    if (attribute_def) return defsById[attribute_def]
    if (attribute_type) return defsByName[attribute_type]
    throw new AttributeDefNotSpecifiedError(csvField)
  }
  
  _.each(mappingDefs, (m, field) => { m.def = getDef(m, field) })
  
  /** @type {Map<string, ICSVImporterMapping>} */
  const mappings = new Map(Object.entries(mappingDefs))

  return { mappings, defs }
}

/**
 * @param {AttachedFile} file
 * @returns {string}
 */
function getExtention (file) {
  const pathExt = path.extname(file?.path ?? '').toLowerCase()
  const nameExt = path.extname(file?.name ?? '').toLowerCase()

  if (!pathExt && !nameExt) {
    assert.fail(`Unable to extract file ${file.id} extension`)
  } else if (!pathExt) {
    Context.warn(`WARN: Unable to extract file ${file.id} extension from its path`)
  } else if (!nameExt) {
    Context.warn(`WARN: Unable to extract file ${file.id} extension from its name`)
  } else if (pathExt !== nameExt) {
    assert.fail(`Extension mismatch (${pathExt} != ${nameExt}) for file ${file.id}`)    
  }

  return pathExt ?? nameExt
}

class CsvEmptyLineError extends Error {
  constructor() {
    super('Empty line')
  }
}

class AttributeDefNotSpecifiedError extends Error {
  constructor(csvField) {
    super(`WARN: No attribute_def specified in mapping for column ${csvField}.`)
  }
}

function parse_value(csvField, def, value) {
  if (def.data_type === 'text' && (!value || value.length < 1)) {
    return null
  }

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
 * @param {string} value 
 * @param {number} index
 */
function* parse_full_address(value, index) {
  const parsed = addressParser.parseLocation(value)
  if (!parsed) {
    Context.log(`Unable to parse '${value}' as a full address`)
    return
  }

  if (parsed.number) yield { attribute_type: 'street_number', index, text: parsed.number }
  if (parsed.prefix) yield { attribute_type: 'street_prefix', index, text: parsed.prefix }
  if (parsed.suffix) yield { attribute_type: 'street_suffix', index, text: parsed.suffix }

  if (parsed.street && parsed.type) {
    yield { attribute_type: 'street_name', index, text: `${parsed.street} ${parsed.type}` }
  } else if (parsed.street) {
    yield { attribute_type: 'street_name', index, text: parsed.street }
  }

  if (parsed.city) yield { attribute_type: 'city', index, text: parsed.city }
  if (parsed.state) yield { attribute_type: 'state', index, text: parsed.state }
  if (parsed.zip) yield { attribute_type: 'postal_code', index, text: parsed.zip }
  if (parsed.sec_unit_num && parsed.sec_unit_type) {
    yield { attribute_type: 'unit_number', index, text: `${parsed.sec_unit_type} ${parsed.sec_unit_num}` }
  } else if (parsed.sec_unit_num) {
    yield { attribute_type: 'unit_number', index, text: parsed.sec_unit_num }
  }
}

function parse_attribute(csvField, def, fieldValue, is_partner, label, attr_index) {
  const parsedValue = parse_value(
    csvField,
    def,
    fieldValue.toString().trim()
  )

  if (parsedValue === null) {
    Context.log(`WARN: Parsed value is null for column ${csvField}.`)
    return
  }

  /** @type {IContactAttributeInput} */
  const attr = {
    attribute_def: def.id,
    is_partner,
    [def.data_type]: parsedValue
  }

  if (label) {
    attr.label = label
  }

  if (def.section === 'Addresses') attr.index = attr_index + 1

  return attr
}

/**
 * 
 * @param {string[]} row 
 * @param {string[]} header 
 * @param {Map<string, ICSVImporterMapping>} mappedFields 
 * @param {IContactAttributeDef[]} defs 
 * @param {{ user: UUID }} base 
 */
function parse_csv_row(row, header, mappedFields, defs, base) {
  const defs_by_name = _.keyBy(defs, 'name')

  /** @type {IContactInput} */
  const contact = {
    ...base,
    attributes: []
  }

  for (let i = 0; i < header.length; i++) {
    const csvField = header[i]
    const mapping = mappedFields.get(csvField)
    if (!mapping) continue

    const {def, is_partner, index, label} = mapping
    if (!def) {
      throw Error.Validation(`Invalid mapping for ${csvField}`)
    }

    const attr_index = index || 0

    const fieldValue = row[i]
    if (!fieldValue) {
      continue
    }

    if (def.name === 'full_address') {
      if (_.isNil(index)) {
        throw Error.Validation('Invalid index for full address mapping')
      }

      try {
        for (const attr of parse_full_address(fieldValue.toString().trim(), index)) {
          contact.attributes.push(attr)
        }
      } catch (ex) {
        Context.error(ex)
        throw Error.Validation(`Unable to parse '${fieldValue}' as a full address`)
      }
    } else if (mapping.multivalued) {
      for (const v of fieldValue.split(',')) {
        const attr = parse_attribute(csvField, def, v, is_partner, label, attr_index)
        if (!attr) continue
        contact.attributes.push(attr)
      }
    } else {
      const attr = parse_attribute(csvField, def, fieldValue, is_partner, label, attr_index)
      if (!attr) continue
      contact.attributes.push(attr)
    }
  }

  if (contact.attributes.length < 1) {
    throw new CsvEmptyLineError
  }

  contact.attributes.push({
    attribute_def: defs_by_name['source_type'].id,
    text: 'CSV'
  })

  return contact
}

/**
 * @param {NodeJS.ReadableStream} stream
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {UUID} owner
 * @param {Record<string, ICSVImporterMappingDef>} mapping_defs
 * @returns {Promise<Record<'total_contacts' | 'empty_lines' | 'contact_ids', any>>}
 */
async function import_csv_stream(stream, user_id, brand_id, owner, mapping_defs) {
  const { mappings, defs } = await prepareMappingDefs(brand_id, mapping_defs)
  
  return new Promise(function(resolve, reject) {
    let chunkIndex = 0
    let totalContacts = 0
    let empty_lines = 0

    let contact_ids = []

    let header_row = null

    // @ts-ignore
    Papa.parse(stream, {
      header: false,
      skipEmptyLines: true,
      // transformHeader(header) {
      //   return header.trim()
      // },
      beforeFirstChunk() {
        Context.log('Job import csv: Reading the CSV file...')
      },
      chunk(results, parser) {
        if (results.data.length < 1) return

        if (!header_row) {
          header_row = results.data[0].map(h => h.trim())
          results.data = results.data.slice(1)
        }

        Context.log(`Processing ${results.data.length} rows...`)

        /** @type {IContactInput[]} */
        const contacts = []

        for (const row of results.data) {
          try {
            contacts.push(parse_csv_row(row, header_row, mappings, defs, { user: owner }))
          }
          catch (ex) {
            if (ex instanceof CsvEmptyLineError) {
              empty_lines += 1
            } else {
              throw ex
            }
          }
        }

        parser.pause()

        Contact.create(contacts, user_id, brand_id, 'import_csv', {
          activity: false,
          relax: true,
          get: false
        }).then(
          res => {
            contact_ids = contact_ids.concat(res)
            totalContacts += res.length
            Context.log(`Job import csv: Chunk #${chunkIndex++} contains ${contacts.length} contacts. ${res.length} contacts were created.`)
            parser.resume()
          },
          ex => {
            Context.log(`Job import csv: Encountered an error while processing chunk #${chunkIndex++}.`)
            Context.error(ex)
            parser.abort()
            reject(ex)
          }
        )
      },

      complete() {
        Context.log(`Job import csv: Total of ${empty_lines} empty lines were ignored.`)
        resolve({
          contact_ids,
          total_contacts: totalContacts,
          empty_lines
        })
      },

      error(error) {
        reject(error)
      }
    })
  })
}

/**
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {UUID} file_id
 * @param {UUID} owner
 * @param {Record<string, ICSVImporterMappingDef>} mapping_defs
 */
async function do_import_csv(user_id, brand_id, file_id, owner, mapping_defs) {
  expect(user_id).to.be.uuid
  expect(brand_id).to.be.uuid
  expect(file_id).to.be.uuid

  await Brand.get(brand_id)

  Context.log(`Job import csv Started for user ${user_id}`)

  const file = await AttachedFile.get(file_id)
  const stream = await AttachedFile.downloadAsStream(file)

  Context.log(`Job import csv: Created S3 stream for file ${file_id}`)

  const { total_contacts, empty_lines, contact_ids } = await (() => {
    // XXX: what about XLS or ODS spreadsheets?
    if (getExtention(file) === '.xlsx') {
      return xlsx.importStream(stream, user_id, brand_id, owner, mapping_defs)
    }

    // assume any other file extension (txt, tsv, etc.) as csv
    return import_csv_stream(stream, user_id, brand_id, owner, mapping_defs)
  })()
  
  const activity = await promisify(Activity.add)(user_id, 'User', {
    action: 'UserImportedContacts',
    object_class: 'ContactImportLog',
    object: {
      type: 'contact_import_log',
      import_type: 'csv',
      args: {
        user_id,
        brand_id,
        file_id,
        owner,
        mappings: mapping_defs
      },
      count: total_contacts,
      result: {
        empty_lines
      },
      brand: brand_id
    }
  })

  await setActivityReference(contact_ids, activity.id)

  return total_contacts
}

/**
 * @param {IContactInput[]} contacts 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 */
async function do_import_json(contacts, user_id, brand_id) {
  expect(user_id).to.be.uuid
  expect(brand_id).to.be.uuid

  await Brand.get(brand_id)

  Context.log(`Job import json started for user ${user_id}`)

  const res = await Contact.create(contacts, user_id, brand_id, 'import_json', {
    activity: false,
    relax: true,
    get: false
  })

  sendSlackSupportMessage(user_id, brand_id, res.length, 'iOS')

  const activity = await promisify(Activity.add)(user_id, 'User', {
    action: 'UserImportedContacts',
    object_class: 'ContactImportLog',
    object: {
      type: 'contact_import_log',
      import_type: 'ios',
      count: res.length,
      brand: brand_id
    }
  })

  await setActivityReference(res, activity.id)

  return res.length
}

/**
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {UUID} file_id
 * @param {UUID} owner
 * @param {Record<string, ICSVImporterMappingDef>} mapping_defs
 * @this {import('peanar/dist/job').default}
 */
async function import_csv(user_id, brand_id, file_id, owner, mapping_defs) {
  try {
    const total_contacts = await do_import_csv(user_id, brand_id, file_id, owner, mapping_defs)
    sendSlackSupportMessage(user_id, brand_id, total_contacts, 'CSV')
    await sendSuccessSocketEvent(SOCKET_EVENT, this.id, user_id, total_contacts)
    return total_contacts
  }
  catch (ex) {
    await sendFailureSocketEvent(SOCKET_EVENT, this.id, user_id, ex)
  }
}

/**
 * @param {IContactInput[]} contacts 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 * @this {import('peanar/dist/job').default}
 */
async function import_json(contacts, user_id, brand_id) {
  try {
    const total_contacts = await do_import_json(contacts, user_id, brand_id)
    sendSlackSupportMessage(user_id, brand_id, total_contacts, 'iOS')
    sendSuccessSocketEvent(SOCKET_EVENT, this.id, user_id, total_contacts)
    return total_contacts
  }
  catch (ex) {
    sendFailureSocketEvent(SOCKET_EVENT, this.id, user_id, ex)
    throw ex
  }
}

async function sendSlackSupportMessage(user_id, brand_id, total_contacts, import_type) {
  const user = await User.get(user_id)
  const brand = await Brand.get(brand_id)

  Context.log(`Job import csv: Finished importing ${total_contacts} contacts from ${import_type} for user ${user.email}.`)

  const text = format(
    '<mailto:%s|%s> imported %d contacts into %s from %s',
    user.email,
    user.display_name,
    total_contacts,
    brand.name,
    import_type
  )

  Slack.send({
    channel: '6-support',
    text: text,
    emoji: ':busts_in_silhouette:'
  })
}

const xlsx = (function xlsxModule () {
  // TODO: use async.cargo / async.queue / async.cargoQueue instead
  function contactCargo ({ userId, brandId, reason = 'import_xlsx', payload = 2048 }) {
    const inputs = []
    const ids = []

    async function flush () {
      if (!inputs.length) { return ids }
      
      const newIds = await Contact.create(inputs, userId, brandId, 'import_xlsx')
      
      ids.push(...newIds)
      inputs.length = 0    
      return ids
    }

    async function push (newIds) {
      ids.push(newIds)
      return ids.length >= payload ? flush() : ids
    }

    return { push, flush }
  }

  function* iterateWorkbook (workbook) {
    for (const sh of workbook.worksheets) {
      if (!sh.rowCount || !sh.columnCount) {
        Context.warn('WARN: Skip empty worksheet: ${sh.name}')
        continue
      }

      if (sh.hasMerges) {
        Context.warn(`WARN: Sheet ${sh.name} has merges`)
      }
      
      const header = sh.getRow(1).values.slice(1).map(_.trim)

      for (let i = 2, nRows = sh.rowCount; i < nRows; i++) {
        const row = sh.getRow(i)
        yield [header, row?.hasValues ? row.values.slice(1) : null]
      }
    }
  }

  /**
   * @param {NodeJS.ReadableStream} stream
   * @param {UUID} userId
   * @param {UUID} brandId
   * @param {UUID} owner
   * @param {Record<string, ICSVImporterMappingDef>} mappingDefs
   * @returns {Promise<Record<'total_contacts' | 'empty_lines' | 'contact_ids', any>>}
   */
  async function importStream (stream, userId, brandId, ownerId, mappingDefs) {
    const { mappings, defs } = await prepareMappingDefs(brandId, mappingDefs)
    
    const workbook = new excel.Workbook()
    await workbook.xlsx.read(stream)
    
    const cargo = contactCargo({ userId, brandId })
    let emptyLines = 0

    for (const [header, row] of iterateWorkbook(workbook)) {
      if (!row) {
        ++emptyLines
        continue
      }

      const input = parse_csv_row(row, header, mappings, defs, { user: ownerId })
      await cargo.push(input)
    }

    const contactIds = await cargo.flush()
    
    return {
      total_contacts: contactIds.length,
      empty_lines: emptyLines,
      contact_ids: contactIds,
    }
  }

  return { importStream }
})()

module.exports = {
  import_csv: peanar.job({
    handler: import_csv,
    queue: 'contact_import',
    exchange: 'contacts',
    error_exchange: 'contacts_import.error'
  }),
  import_json: peanar.job({
    handler: import_json,
    queue: 'contact_import',
    exchange: 'contacts',
    error_exchange: 'contacts_import.error'
  })
}
