const Activity = require('../../Activity/add')
const Context = require('../../Context')

const Papa = require('papaparse')

const promisify = require('../../../utils/promisify')
const expect = require('../../../utils/validator').expect
const { peanar } = require('../../../utils/peanar')

const AttachedFile = require('../../AttachedFile')
const Brand = require('../../Brand/get')

const Contact = require('../index')
const { setActivityReference } = require('../activity')

const { sendFailureSocketEvent, sendSuccessSocketEvent } = require('./socket')
const utils = require('./import-utils')

const SOCKET_EVENT = 'contact:import'

// @ts-ignore
Papa.LocalChunkSize = 100 * 1024 // 100KB
// @ts-ignore
Papa.RemoteChunkSize = 100 * 1024 // 100KB

/**
 * @typedef {object} CsvImportResult
 * @property {number} total_contacts
 * @property {number} empty_lines
 * @property {IContact['id'][]} contact_ids
 *
 * @param {NodeJS.ReadableStream} stream
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {UUID} owner
 * @param {Record<string, ICSVImporterMappingDef>} mapping_defs
 * @returns {Promise<CsvImportResult>}
 */
async function import_csv_stream(stream, user_id, brand_id, owner, mapping_defs) {
  const { mappings, defs } = await utils.prepareMappingDefs(brand_id, mapping_defs)
  
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
            contacts.push(utils.parseRow(row, header_row, mappings, defs, { user: owner }, 'CSV'))
          }
          catch (ex) {
            if (ex instanceof utils.EmptyLineError) {
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
  const stream = await /** @type {any} */(AttachedFile).downloadAsStream(file)

  Context.log(`Job import csv: Created S3 stream for file ${file_id}`)

  const { total_contacts, empty_lines, contact_ids } = await import_csv_stream(
    stream, user_id, brand_id, owner, mapping_defs
  )
  
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
    utils.sendSlackSupportMessage(user_id, brand_id, total_contacts, 'CSV')
    await sendSuccessSocketEvent(SOCKET_EVENT, this.id, user_id, total_contacts)
    return total_contacts
  }
  catch (ex) {
    await sendFailureSocketEvent(SOCKET_EVENT, this.id, user_id, ex)
  }
}

module.exports = {
  import_csv: peanar.job({
    handler: import_csv,
    queue: 'contact_import',
    exchange: 'contacts',
    error_exchange: 'contacts_import.error'
  }),
}
