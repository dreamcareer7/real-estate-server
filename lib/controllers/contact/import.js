const _ = require('lodash')
const { expect } = require('chai')

const AttachedFile = require('../../models/AttachedFile')
const AttributeDef = require('../../models/Contact/attribute_def/get')
const Brand = require('../../models/Brand')
const Worker = require('../../models/Contact/worker/import')

const { getCurrentBrand } = require('./common')

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

async function importContactsCsv(req, res) {
  const brand_id = getCurrentBrand()

  const owner = req.body.owner
  expect(owner).to.be.uuid

  await Brand.limitAccess({
    brand: brand_id,
    user: owner
  })

  const file_id = req.body.file_id
  expect(file_id).to.be.uuid

  await AttachedFile.get(file_id)

  const mappings = req.body.mappings
  expect(mappings).to.be.an('object')

  const def_ids = await AttributeDef.getForBrand(brand_id)
  const defs = await AttributeDef.getAll(def_ids)
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs.filter(d => d.name), 'name')

  /** @type {UUID[]} */
  const mapped_fields = []

  for (let i = 0; i < mappings.length; i++) {
    if (!mappings[i].attribute_def && !mappings[i].attribute_type) {
      throw Error.Validation(`Mapping #${i} has no attribute_def or attribute_type defined.`)
    }
    if (!def_ids.includes(mappings[i].attribute_def) && !defs_by_name.hasOwnProperty(mappings[i].attribute_type)) {
      throw Error.Validation(`Mapping #${i} has a non-existing attribute_def or attribute_type.`)
    }

    const def = mappings[i].attribute_def ?
      defs_by_id[mappings[i].attribute_def] :
      defs_by_name[mappings[i].attribute_type]

    if (mapped_fields.includes(def.id) && def.singular) {
      throw Error.Validation(`Mapping #${i} is singular, but it's mapped more than once.`)
    }

    mapped_fields.push(def.id)
  }

  const job_id = await Worker.import_csv.immediate(
    req.user.id,
    brand_id,
    file_id,
    owner,
    mappings
  )

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

async function importContactsJson(req, res) {
  const brand_id = getCurrentBrand()
  const user_id = req.user.id

  const { contacts } = req.body
  expect(contacts).to.be.an('array')
  const owners = _.uniq(contacts.map(c => c.user))

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
  importContactsCsv,
  importContactsJson,
  jobStatus
}
