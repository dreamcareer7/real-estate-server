const format = require('util').format
const Activity = require('../../Activity')
const Context = require('../../Context')

const _ = require('lodash')
// eslint-disable-next-line no-unused-vars
const kue = require('kue')
const moment = require('moment')
const Papa = require('papaparse')

const promisify = require('../../../utils/promisify')
const expect = require('../../../utils/validator').expect

const AttachedFile = require('../../AttachedFile')
const Slack = require('../../Slack')
const User = require('../../User')
const Brand = require('../../Brand')

const Contact = require('../index')
const AttributeDef = require('../attribute_def')

// @ts-ignore
Papa.LocalChunkSize = 100 * 1024 // 100KB
// @ts-ignore
Papa.RemoteChunkSize = 100 * 1024 // 100KB

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
 * 
 * @param {any} row 
 * @param {Map<string, ICSVImporterMapping>} mappedFields 
 * @param {IContactAttributeDef[]} defs 
 * @param {{ user: UUID }} base 
 */
function parse_csv_row(row, mappedFields, defs, base) {
  const defs_by_name = _.keyBy(defs, 'name')

  /** @type {IContactInput} */
  const contact = {
    ...base,
    attributes: []
  }

  for (const [csvField, {def, is_partner, index, label}] of mappedFields.entries()) {
    const attr_index = index || 0

    const fieldValue = row[csvField]
    if (!fieldValue) {
      continue
    }

    const parsedValue = parse_value(
      csvField,
      def,
      fieldValue.toString().trim()
    )

    if (parsedValue === null) {
      Context.log(`WARN: Parsed value is null for column ${csvField}.`)
      continue
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

    contact.attributes.push(attr)
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
 *
 * @param {NodeJS.ReadableStream} stream
 * @param {kue.Job} job
 * @returns {Promise<Record<'total_contacts' | 'empty_lines', any>>}
 */
async function import_csv_stream(stream, job) {
  const {user_id, brand_id, owner} = job.data

  const def_ids = await AttributeDef.getForBrand(brand_id)
  const defs = await AttributeDef.getAll(def_ids)
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs, 'name')

  /** @type {Record<string, ICSVImporterMappingDef>} */
  const mapping_defs = job.data.mappings

  /** @type {Map<string, ICSVImporterMapping>} */
  const mappings = new Map

  for (const [csvField, mapping] of Object.entries(mapping_defs)) {
    const def = function() {
      if (mapping.attribute_def) return defs_by_id[mapping.attribute_def]
      if (mapping.attribute_type) return defs_by_name[mapping.attribute_type]
      throw new AttributeDefNotSpecifiedError(csvField)
    }()

    mappings.set(csvField, {
      def,
      index: mapping.index,
      label: mapping.label,
      is_partner: mapping.is_partner
    })
  }

  return new Promise(function(resolve, reject) {
    let chunkIndex = 0
    let totalContacts = 0
    let empty_lines = 0

    // @ts-ignore
    Papa.parse(stream, {
      header: true,
      trimHeaders: true,
      skipEmptyLines: true,
      beforeFirstChunk() {
        Context.log(`Job #${job.id}: ` + 'Reading the CSV file...')
      },
      async chunk(results, parser) {
        if (results.data.length < 1) return

        /** @type {IContactInput[]} */
        const contacts = []

        for (const row of results.data) {
          try {
            contacts.push(parse_csv_row(row, mappings, defs, { user: owner }))
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

        const res = await Contact.create(contacts, user_id, brand_id, {
          activity: false,
          relax: true,
          get: false
        })

        totalContacts += res.length

        Context.log(`Job #${job.id}: Chunk #${chunkIndex++} contains ${contacts.length} contacts. ${res.length} contacts were created.`)

        parser.resume()
      },

      complete() {
        Context.log(`Job #${job.id}: Total of ${empty_lines} empty lines were ignored.`)
        resolve({
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
 * @param {kue.Job} job
 */
async function import_csv(job) {
  expect(job.data.user_id).to.be.uuid
  expect(job.data.brand_id).to.be.uuid

  await Brand.get(job.data.brand_id)

  Context.log(`Job #${job.id} (${job.data.type}) Started for user ${job.data.user_id}`)

  const file_id = job.data.file_id
  expect(file_id).to.be.uuid

  const stream = await AttachedFile.downloadAsStream(file_id)

  Context.log(`Job #${job.id}: Created S3 stream for file ${file_id}`)

  const {total_contacts, empty_lines} = await import_csv_stream(stream, job)
  sendSlackSupportMessage(job, total_contacts, 'CSV')

  await promisify(Activity.add)(job.data.user_id, 'User', {
    action: 'UserImportedContacts',
    object_class: 'ContactImportLog',
    object: {
      type: 'contact_import_log',
      import_type: 'csv',
      args: job.data,
      count: total_contacts,
      result: {
        empty_lines
      },
      brand: job.data.brand_id
    }
  })

  return total_contacts
}

async function import_json(job) {
  expect(job.data.user_id).to.be.uuid
  expect(job.data.brand_id).to.be.uuid

  const {user_id, brand_id, contacts} = job.data

  await Brand.get(brand_id)

  Context.log(`Job #${job.id} (${job.data.type}) Started for user ${user_id}`)

  const res = await Contact.create(contacts, user_id, brand_id, {
    activity: false,
    relax: true,
    get: false
  })

  sendSlackSupportMessage(job, res.length, 'iOS')

  await promisify(Activity.add)(job.data.user_id, 'User', {
    action: 'UserImportedContacts',
    object_class: 'ContactImportLog',
    object: {
      type: 'contact_import_log',
      import_type: 'ios',
      count: res.length,
      brand: brand_id
    }
  })
}

async function sendSlackSupportMessage(job, total_contacts, import_type) {
  const user_id = job.data.user_id
  const brand_id = job.data.brand_id

  const user = await User.get(user_id)
  const brand = await Brand.get(brand_id)

  Context.log(`Job #${job.id}: Finished importing ${total_contacts} from ${import_type} for user ${user.email}.`)

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

module.exports = {
  import_csv,
  import_json
}
