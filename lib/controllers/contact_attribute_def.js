const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const promisify = require('../utils/promisify')

const Brand = require('../models/Brand')
const Activity = require('../models/Activity')
const AttributeDef = require('../models/Contact/attribute_def')
const Slack = require('../models/Slack.js')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand)
    throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

async function limitAccess(action, brand_id, ids) {
  for (const id of ids) {
    expect(id).to.be.uuid
  }

  const accessIndex = await AttributeDef.hasAccess(brand_id, action, ids)

  for (const id of ids) {
    if (!accessIndex.get(id)) {
      throw Error.ResourceNotFound(`AttributeDef ${id} not found`)
    }
  }
}

function access(action) {
  return (req, res, next) => {
    const ids = Array.isArray(req.query.ids) ?
      req.query.ids :
      [req.params.id]

    limitAccess(action, getCurrentBrand(), ids).nodeify(err => {
      if (err) {
        return res.error(err)
      }

      next()
    })
  }
}


async function getAll(req, res) {
  const def_ids = await AttributeDef.getForBrand(getCurrentBrand())
  const defs = await AttributeDef.getAll(def_ids)

  return res.collection(defs)
}

function sanity_check(attribute_def) {
  expect(attribute_def).to.be.an('object')

  if (Array.isArray(attribute_def.enum_values)) {
    if (attribute_def.data_type !== 'text') {
      throw Error.Validation('enum_values can be specified for text attribute_defs only.')
    }

    if (attribute_def.enum_values.length === 0) {
      throw Error.Validation('enum_values should either be null or an array of one or more values')
    }
    
    if (attribute_def.enum_values.some(x => typeof x !== 'string')) {
      throw Error.Validation('All enum_values should be string.')
    }
  }
}

async function create(req, res) {
  const user_id = req.user.id
  const attribute_def = req.body
  sanity_check(attribute_def)
  
  const id = await AttributeDef.create(user_id, getCurrentBrand(), attribute_def)
  const added = await AttributeDef.get(id)

  const activity = {
    action: 'UserCreatedContactAttributeDef',
    object_class: 'contact_attribute_def',
    object: id
  }

  await promisify(Activity.add)(user_id, 'User', activity)

  Slack.send({
    channel: '6-support',
    text: `${req.user.display_name} created a ${added.data_type} custom attribute "${added.label}"`,
    emoji: ':busts_in_silhouette:'
  })

  return res.model(added)
}

async function get(req, res) {
  const def_id = req.params.id
  expect(def_id).to.be.uuid

  const attribute_def = await AttributeDef.get(def_id)

  return res.model(attribute_def)
}

async function update(req, res) {
  const def_id = req.params.id
  expect(def_id).to.be.uuid

  const attribute_def = req.body
  sanity_check(attribute_def)

  await AttributeDef.update(def_id, attribute_def)
  const updated = await AttributeDef.get(def_id)

  return res.model(updated)
}

async function remove(req, res) {
  const def_id = req.params.id
  expect(def_id).to.be.uuid

  await AttributeDef.delete(def_id) // TODO: Get affected contacts to send live events

  res.status(204)
  res.end()
}

module.exports = function(app) {
  const auth = app.auth.bearer.middleware

  app.get('/contacts/attribute_defs', auth, am(getAll))
  app.post('/contacts/attribute_defs', auth, am(create))

  app.get('/contacts/attribute_defs/:id', auth, access('read'), am(get))
  app.put('/contacts/attribute_defs/:id', auth, access('update'), am(update))
  app.delete('/contacts/attribute_defs/:id', auth, access('update'), am(remove))
}