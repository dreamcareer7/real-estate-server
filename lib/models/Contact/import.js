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
    let empty_lines = 0

    Papa.parse(stream, {
      header: true,
      trimHeaders: true,
      step(results, parser) {
        const row = results.data[0]

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

          contacts.push(contact)
        }
        else {
          empty_lines += 1
        }
      },

      complete() {
        if (empty_lines > 0) {
          debug('Ignored', empty_lines, 'lines')
        }
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
  if (job.data.type) {
    debug(`Job #${job.id} (${job.data.type}) Started for user ${job.data.user_id}`)
  }

  const user_id = job.data.user_id
  expect(user_id).to.be.uuid

  const file_id = job.data.file_id
  expect(file_id).to.be.uuid

  /** @type {Record<string, ICSVImporterMappedField>} */
  const mappedFields = job.data.mappings

  const stream = await AttachedFile.downloadAsStream(file_id)

  debug(`Job #${job.id}: ` + 'Created S3 stream for file ' + file_id)

  const def_ids = await AttributeDef.getForUser(user_id)
  const defs = await AttributeDef.getAll(def_ids)

  const contacts = await parse(stream, mappedFields, defs)

  debug(`Job #${job.id}: ` + 'Read the CSV file...')

  await import_json({ data: { user_id, contacts } })
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