const { strict: assert } = require('assert')
const { expect } = require('chai')
const excel = require('exceljs')

const AttachedFile = require('../../AttachedFile')
const Activity = require('../../Activity/add')
const Brand = require('../../Brand/get')
const Context = require('../../Context')
const Contact = require('..')

const { sendFailureSocketEvent, sendSuccessSocketEvent } = require('./socket')
const { setActivityReference } = require('../activity')
const promisify = require('../../../utils/promisify')
const { peanar } = require('../../../utils/peanar')
const utils = require('./utils')

const SOCKET_EVENT = 'contact:import'

/**
 * @param {object} opts
 * @param {IUser['id']} opts.userId
 * @param {IBrand['id']} opts.brandId
 * @param {TContactActionReason=} [opts.reason]
 * @param {number=} [opts.payload]
 * @returns 
 */
function contactCargo({ userId, brandId, reason = 'import_xlsx', payload = 2048 }) {
  // TODO: use async.cargo / async.queue / async.cargoQueue instead
  const inputs = []
  const ids = []

  /** @returns {Promise<IContact['id'][]>} */
  async function flush() {
    if (!inputs.length) { return ids }

    const newIds = await Contact.create(inputs, userId, brandId, reason)

    ids.push(...newIds)
    inputs.length = 0
    return ids
  }

  /**
   * @param {IContactInput} input
   * @returns {Promise<IContact['id'][]>}
   */
  async function push(input) {
    inputs.push(input)
    return inputs.length >= payload ? flush() : ids
  }

  return { push, flush }
}

/**
 * @param {excel.Row} row
 * @returns {any[]} 
 */
function rowValues(row) {
  assert(Array.isArray(row.values), 'Row.values is not array. Really?!')
  return row.values.slice(1)
}

/**
 * @param {excel.Workbook} workbook
 * @yields {[string[] | null, any[] | null]}
 */
function* iterateWorkbook(workbook) {
  for (const sh of workbook.worksheets) {
    if (sh.hasMerges) {
      Context.warn(`WARN: Sheet ${sh.name} has merges`)
    }
    if (!sh.rowCount || !sh.columnCount) {
      Context.warn(`WARN: Skip empty worksheet: ${sh.name}`)
      continue
    }

    let header = null

    for (let i = 1, rowCount = sh.rowCount; i < rowCount; ++i) {
      const row = sh.getRow(i)

      if (!row.hasValues) {
        yield [header, null]
      } else if (!header?.length) {
        header = rowValues(row).map(v => String(v ?? '').trim())
      } else {
        yield [header, rowValues(row)]
      }
    }

    if (!header?.length) {
      Context.warn(`WARN: Unable to parse empty header for sheet: ${sh.name}`)
    }
  }
}

/**
 * @typedef {object} ImportResult
 * @property {IContact['id'][]} contactIds
 * @property {number} emptyLines
 * @property {number} totalContacts
 *
 * @param {NodeJS.ReadableStream} stream
 * @param {IUser['id']} userId
 * @param {IBrand['id']} brandId
 * @param {IUser['id']} ownerId
 * @param {Record<string, ICSVImporterMappingDef>} mappingDefs
 * @returns {Promise<ImportResult>}
 */
async function importStream(stream, userId, brandId, ownerId, mappingDefs) {
  const { mappings, defs } = await utils.prepareMappingDefs(brandId, mappingDefs)

  const workbook = new excel.Workbook()
  await workbook.xlsx.read(stream)

  const cargo = contactCargo({ userId, brandId })
  let emptyLines = 0

  for (const [header, row] of iterateWorkbook(workbook)) {
    if (!row || !header) {
      ++emptyLines
      continue
    }

    const input = utils.parseRow(row, header, mappings, defs, { user: ownerId }, 'XLSX')
    await cargo.push(input)
  }

  const contactIds = await cargo.flush()

  return {
    totalContacts: contactIds.length,
    emptyLines,
    contactIds,
  }
}

/**
 * @param {IUser['id']} userId
 * @param {IBrand['id']} brandId
 * @param {UUID} fileId
 * @param {IUser['id']} ownerId
 * @param {Record<string, ICSVImporterMappingDef>} mappingDefs
 */
async function doImport(userId, brandId, fileId, ownerId, mappingDefs) {
  expect(userId).to.be.uuid
  expect(brandId).to.be.uuid
  expect(fileId).to.be.uuid

  await Brand.get(brandId)

  Context.log(`Job import xlsx Started for user ${userId}`)

  const file = await AttachedFile.get(fileId)
  const stream = await /** @type {any} */(AttachedFile).downloadAsStream(file)

  Context.log(`Job import xlsx: Created S3 stream for file ${fileId}`)

  const { totalContacts, emptyLines, contactIds } = await importStream(
    stream, userId, brandId, ownerId, mappingDefs
  )

  const activity = await promisify(Activity.add)(userId, 'User', {
    action: 'UserImportedContacts',
    object_class: 'ContactImportLog',
    object: {
      type: 'contact_import_log',
      import_type: 'xlsx',
      args: {
        user_id: userId,
        brand_id: brandId,
        file_id: fileId,
        owner: ownerId,
        mappings: mappingDefs,
      },
      count: totalContacts,
      result: { emptyLines },
      brand: brandId
    }
  })

  await setActivityReference(contactIds, activity.id)

  return totalContacts
}

/**
 * @param {IUser['id']} userId
 * @param {IBrand['id']} brandId
 * @param {UUID} fileId
 * @param {IUser['id']} ownerId
 * @param {Record<string, ICSVImporterMappingDef>} mappingDefs
 * @this {import('peanar/dist/job').default}
 */
async function importXlsx(userId, brandId, fileId, ownerId, mappingDefs) {
  try {
    const totalContacts = await doImport(userId, brandId, fileId, ownerId, mappingDefs)

    utils.sendSlackSupportMessage(userId, brandId, totalContacts, 'XLSX')
    await sendSuccessSocketEvent(SOCKET_EVENT, this.id, userId, totalContacts)

    return totalContacts
  } catch (err) {
    await sendFailureSocketEvent(SOCKET_EVENT, this.id, userId, err)
  }
}

module.exports = {
  import_xlsx: peanar.job({
    handler: importXlsx,
    name: 'import_xlsx',
    queue: 'contact_import',
    exchange: 'contacts',
    error_exchange: 'contacts_import.error'
  })
}
