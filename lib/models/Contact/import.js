const format = require('util').format
const debug = require('debug')('rechat:workers:csvimport')

const _ = require('lodash')
// eslint-disable-next-line no-unused-vars
const kue = require('kue')
const moment = require('moment')
const Papa = require('papaparse')

const expect = require('../../utils/validator').expect
const promisify = require('../../utils/promisify')

const AttachedFile = require('../AttachedFile')
const Slack = require('../Slack')
const User = require('../User')

const Contact = require('./index')
const AttributeDef = require('./attribute_def')

Papa.LocalChunkSize = 100 * 1024 // 100KB
Papa.RemoteChunkSize = 100 * 1024 // 100KB

function parseValue(csvField, def, value) {
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

function parse_csv_row(row, mappedFields, defs) {
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs, 'name')

  /** @type {IContactInput} */
  const contact = {
    attributes: []
  }

  _.each(
    mappedFields,
    ({ attribute_def: def_id, attribute_type: def_name, label, index = 0 }, csvField) => {
      if (!def_id && !def_name) {
        debug(
          `WARN: No attribute_def specified in mapping for column ${csvField}.`
        )
        return true
      }

      const def = def_id ? defs_by_id[def_id] : defs_by_name[def_name]

      const fieldValue = row[csvField]
      if (!fieldValue) {
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
        attribute_def: def.id,
        [def.data_type]: parsedValue
      }

      if (label) {
        attr.label = label
      }

      if (def.section === 'Addresses') attr.index = index + 1

      contact.attributes.push(attr)
    }
  )

  if (contact.attributes.length > 0) {
    contact.attributes.push({
      attribute_def: defs_by_name['source_type'].id,
      text: 'CSV'
    })
    contact.attributes.push({
      attribute_def: defs_by_name['stage'].id,
      text: 'General'
    })

    return contact
  }
}

/**
 *
 * @param {ReadableStream} stream
 * @param {kue.Job} job
 * @returns {Promise<IContactInput[]>}
 */
async function import_csv_stream(stream, job) {
  const user_id = job.data.user_id
  const def_ids = await AttributeDef.getForUser(user_id)
  const defs = await AttributeDef.getAll(def_ids)

  /** @type {Record<string, ICSVImporterMappedField>} */
  const mappedFields = job.data.mappings

  let empty_lines = 0
  /** @type {Promise<UUID[]>} */
  let promise = Promise.resolve([])

  return new Promise(function(resolve, reject) {
    Papa.parse(stream, {
      header: true,
      trimHeaders: true,
      skipEmptyLines: true,
      chunk(results, parser) {
        /** @type {IContactInput[]} */
        const contacts = []

        for (const row of results.data) {
          const contact = parse_csv_row(row, mappedFields, defs)
          if (contact)
            contacts.push(contact)
          else
            empty_lines += 1
        }

        promise = promise.then(() => Contact.create(job.data.user_id, job.data.contacts, {
          activity: false,
          relax: true,
          get: false
        }), reject)
      },

      complete() {
        if (empty_lines > 0) {
          debug('Ignored', empty_lines, 'lines')
        }
        promise.then(resolve, reject)
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

  if (job.data.type) {
    debug(`Job #${job.id} (${job.data.type}) Started for user ${job.data.user_id}`)
  }

  const file_id = job.data.file_id
  expect(file_id).to.be.uuid

  const stream = await AttachedFile.downloadAsStream(file_id)

  debug(`Job #${job.id}: ` + 'Created S3 stream for file ' + file_id)

  const contacts = await import_csv_stream(stream, job)

  debug(`Job #${job.id}: ` + 'Read the CSV file...')
}

async function import_json(job) {
  if (job.data.type) {
    debug(`Job #${job.id} (${job.data.type}) Started for user ${job.data.user_id}`)
  }

  const res = await Contact.create(job.data.user_id, job.data.contacts, {
    activity: false,
    relax: true,
    get: false
  })

  debug(`Job #${job.id}: ` + 'Created the contacts...')

  const user = await promisify(User.get)(job.data.user_id)
  const text = format(
    '%s imported %d contacts',
    user.display_name,
    res.length
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
