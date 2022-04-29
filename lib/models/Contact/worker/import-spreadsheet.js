const { expect } = require('chai')
const xlsx = require('xlsx')

const AttachedFile = require('../../AttachedFile')
const Activity = require('../../Activity/add')
const Brand = require('../../Brand/get')
const Context = require('../../Context')

const { sendFailureSocketEvent, sendSuccessSocketEvent } = require('./socket')
const { setActivityReference } = require('../activity')
const promisify = require('../../../utils/promisify')
const { peanar } = require('../../../utils/peanar')
const utils = require('./import-utils')

const SOCKET_EVENT = 'contact:import'

const MERGES = '!merges'
const REF = '!ref'
const START = 's'
const END = 'e'
const COL = 'c'
const ROW = 'r'

/**
 * @param {xlsx.Sheet} sheet
 * @returns {boolean}
 */
function isEmptySheet(sheet) {
  const ref = sheet?.[REF]
  if (typeof ref !== 'string') { return true }

  try {
    const r = xlsx.utils.decode_range(ref)
    return r[START][COL] === r[END][COL] || r[START][ROW] === r[END][ROW]
  } catch (err) {
    Context.error(`Unable to decode sheet ref: ${err}`)
    return true
  }
}

/**
 * @param {any[][]} data - will be mutated
 * @param {xlsx.Range} merge
 * @returns {any[][]}
 */
function fixMerge(data, merge) {
  const { [ROW]: row1, [COL]: col1 } = merge[START]
  const { [ROW]: row2, [COL]: col2 } = merge[END]
  const mergedValue = data[row1][col1]

  for (let r = row1; r <= row2; ++r) {
    const row = data[r]
    for (let c = col1; c <= col2; ++c) {
      row[c] = mergedValue
    }
  }

  return data
}

/**
 * @param {xlsx.Sheet} sheet
 * @returns {any[][]}
 */
function parseSheetData(sheet) {
  if (!sheet) { return [] }
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null })

  for (const merge of sheet[MERGES] ?? []) {
    fixMerge(data, merge)
  }

  return data
}

/**
 * @param {xlsx.WorkBook} workbook
 * @yields {[string[] | null, RowData | null]}
 */
function* iterateWorkbook(workbook) {
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const sheetData = parseSheetData(sheet)
    
    if (sheet[MERGES]?.length) {
      Context.warn(`WARN: Worksheet ${name} has merges`)
    }
    if (isEmptySheet(sheet)) {
      Context.warn(`WARN: Skip empty worksheet: ${name}`)
      continue
    }

    let header = null

    for (const row of sheetData) {
      if (!row.some(Boolean)) {
        yield [header, null]
      } else if (!header?.length) {
        header = row.map(v => String(v ?? '').trim())
        Object.freeze(header)
      } else {
        yield [header, row]
      }
    }

    if (!header?.length) {
      Context.warn(`WARN: Unable to parse header for worksheet: ${name}`)
    }
  }
}

/**
 * @typedef {object} ImportResult
 * @property {IContact['id'][]} contactIds
 * @property {number} emptyLines
 * @property {number} totalContacts
 *
 * @param {Buffer} buff
 * @param {IUser['id']} userId
 * @param {IBrand['id']} brandId
 * @param {IUser['id']} ownerId
 * @param {Record<string, ICSVImporterMappingDef>} mappingDefs
 * @returns {Promise<ImportResult>}
 */
async function importBuffer(buff, userId, brandId, ownerId, mappingDefs) {
  const { mappings, defs } = await utils.prepareMappingDefs(brandId, mappingDefs)

  const workbook = xlsx.read(buff)
  const cargo = utils.contactCargo({ userId, brandId, reason: 'import_spreadsheet' })
  let emptyLines = 0

  for (const [header, row] of iterateWorkbook(workbook)) {
    if (!row || !header) {
      ++emptyLines
      continue
    }

    const input = utils.parseRow(row, header, mappings, defs, { user: ownerId }, 'Spreadsheet')

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
  const buff = await /** @type {any} */(AttachedFile).downloadAsBuffer(file)

  Context.log(`Job import spreadsheet: Created S3 buffer for file ${fileId}`)

  const { totalContacts, emptyLines, contactIds } = await importBuffer(
    buff, userId, brandId, ownerId, mappingDefs
  )

  const activity = await promisify(Activity.add)(userId, 'User', {
    action: 'UserImportedContacts',
    object_class: 'ContactImportLog',
    object: {
      type: 'contact_import_log',
      import_type: 'spreadsheet',
      args: {
        user_id: userId,
        brand_id: brandId,
        file_id: fileId,
        owner: ownerId,
        mappings: mappingDefs,
      },
      count: totalContacts,
      result: { empty_lines: emptyLines },
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
async function importSpreadsheet(userId, brandId, fileId, ownerId, mappingDefs) {
  try {
    const totalContacts = await doImport(userId, brandId, fileId, ownerId, mappingDefs)

    utils.sendSlackSupportMessage(userId, brandId, totalContacts, 'Spreadsheet')
    await sendSuccessSocketEvent(SOCKET_EVENT, this.id, userId, totalContacts)

    return totalContacts
  } catch (err) {
    await sendFailureSocketEvent(SOCKET_EVENT, this.id, userId, err)
  }
}

module.exports = {
  import_spreadsheet: peanar.job({
    handler: importSpreadsheet,
    name: 'import_spreadsheet',
    queue: 'contact_import',
    exchange: 'contacts',
    error_exchange: 'contacts_import.error'
  })
}
