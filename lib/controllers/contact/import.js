const uniq = require('lodash/uniq')
const { expect } = require('chai')

const AttachedFile = require('../../models/AttachedFile')
const AttributeDef = require('../../models/Contact/attribute_def/get')
const Brand = require('../../models/Brand')
const Worker = require('../../models/Contact/worker/import')

const { getCurrentBrand } = require('./common')

/** @typedef {Record<string, ICSVImporterMappingDef>} Mappings */

/**
 * @param {IBrand['id']} brandId 
 * @param {Mappings} mappings 
 */
async function validateMappings (brandId, mappings) {
  const defIds = await AttributeDef.getForBrand(brandId)
  const defs = await AttributeDef.getAll(defIds)

  const defsByName = new Map(defs.filter(d => d.name).map(d => [d.name, d]))
  const defsById = new Map(defs.map(d => [d.id, d]))
  
  const mappedFields = new Set()
  const mappedPartnerFields = new Set()
  const mappedSet = m => m.is_partner ? mappedPartnerFields : mappedFields

  for (const [name, m] of Object.entries(mappings)) {
    if (!m.attribute_def && m.attribute_type === 'full_address') {
      continue
    }
    
    if (!m.attribute_def && !m.attribute_type) {
      throw Error.Validation(`Mapping "${name}" has no attribute_def or attribute_type defined.`)
    }

    const def = (m.attribute_type && defsByName.get(m.attribute_type)) || defsById.get(m.attribute_def)

    if (!def) {
      throw Error.Validation(`Mapping "${name}" has a non-existing attribute_def or attribute_type.`)
    }
    if (def.singular && mappedSet(m).has(def.id)) {
      throw Error.Validation(`Mapping "${name}" ${m.is_partner ? '(Partner)' : ''} is singular, but it's mapped more than once.`)
    }

    mappedSet(m).add(def.id)
  }
}

function upload(req, res) {
  AttachedFile.saveFromRequest({
    path: req.user.id + '-' + Date.now().toString(),
    req,
    relations: [{
      role: 'Brand',
      role_id: getCurrentBrand()
    }],
    public: false
  }, (err, {file}) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

async function importContactsJson(req, res) {
  const brand_id = getCurrentBrand()
  const user_id = req.user.id

  const { contacts } = req.body
  expect(contacts).to.be.an('array')
  const owners = uniq(contacts.map(c => c.user))

  for (const owner of owners) {
    await Brand.limitAccess({
      brand: brand_id,
      user: owner
    })
  }

  const job_id = await Worker.import_json.immediate(
    contacts,
    user_id,
    brand_id
  )

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ ext: string }, {}, { owner: IUser['id'], file_id: UUID, mappings: Mappings }>} req 
 * @param {import('../../../types/monkey/controller').IResponse} res 
 */
async function importSpreadsheet (req, res) {
  const brandId = getCurrentBrand()
  const userId = req.user.id

  const { mappings, owner: ownerId, file_id: fileId } = req.body
  expect(mappings).to.be.an('object')
  expect(ownerId).to.be.uuid
  expect(fileId).to.be.uuid

  await Brand.limitAccess({ brand: brandId, user: ownerId })
  await validateMappings(brandId, mappings)
  await AttachedFile.get(fileId)

  /** @type {keyof Worker} */
  const jobName = req.params.ext === 'csv' ? 'import_csv' : 'import_spreadsheet'
  
  const jobId = await /** @type {any} */(Worker[jobName]).immediate(
    userId, 
    brandId, 
    fileId, 
    ownerId, 
    mappings,
  )

  res.json({ code: 'OK', data: { job_id: jobId } })
}

async function jobStatus(req, res) {
  res.json({
    code: 'OK',
    data: {
      state: 'pending'
    }
  })
}

module.exports = {
  upload,
  importContactsJson,
  importSpreadsheet,
  jobStatus
}
