const expect = require('../../utils/validator').expect
const am = require('../../utils/async_middleware')
const promisify = require('../../utils/promisify')

const Activity = require('../../models/Activity')
const Brand = require('../../models/Brand')
const Contact = require('../../models/Contact/access')
const AttributeDef = require('../../models/Contact/attribute_def/get')
const ContactList = require('../../models/Contact/list')
const ContactTag = require('../../models/Contact/tag')
const ListMember = require('../../models/Contact/list/members')
const Slack = require('../../models/Slack')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

async function limitContactAccess(user_id, action, ids) {
  for (const contact_id of ids) {
    expect(contact_id).to.be.uuid
  }

  const accessIndex = await Contact.hasAccess(getCurrentBrand(), user_id, action, ids)

  for (const contact_id of ids) {
    if (!accessIndex.get(contact_id)) {
      throw Error.ResourceNotFound(`Contact ${contact_id} not found`)
    }
  }
}

function access(action) {
  return (req, res, next) => {
    const ids = Array.isArray(req.query.ids) ? req.query.ids : [req.params.id]

    ContactList.hasAccess(getCurrentBrand(), action, ids).nodeify(
      (err, accessIndex) => {
        if (err) throw err

        for (const contact_id of ids) {
          if (!accessIndex.get(contact_id)) {
            throw Error.ResourceNotFound(`Contact ${contact_id} not found`)
          }
        }

        next()
      }
    )
  }
}

async function create(req, res) {
  const brand_id = getCurrentBrand()
  const data = req.body

  const def_ids = await AttributeDef.getForBrand(brand_id)
  const defs = await AttributeDef.getAll(def_ids)
  const defs_by_name = defs.reduce((idx, def) => {
    idx[def.name] = def.id
    return idx
  }, {})

  if (Array.isArray(data.filters)) {
    for (const f of data.filters) {
      f.attribute_def = f.attribute_def || (f.attribute_type ? defs_by_name[f.attribute_type] : null)
    }
  }

  const list_id = await ContactList.create(
    req.user.id,
    brand_id,
    {
      ...req.body,
      is_editable: true
    }
  )
  const formattedCriteria = await ContactList.formatCriteria(req.body)

  Slack.send({
    channel: '6-support',
    text: `<mailto:${req.user.email}|${req.user.display_name}> created a contact list: ${formattedCriteria}`,
    emoji: ':busts_in_silhouette:'
  })

  await promisify(Activity.add)(req.user.id, 'User', {
    action: 'UserCreatedContactList',
    object_class: 'contact_list',
    object: list_id
  })

  const list = await ContactList.get(list_id)

  res.model(list)
}

async function update(req, res) {
  expect(req.params.id).to.be.uuid
  await ContactList.update(req.params.id, req.body, req.user.id)

  const updated = await ContactList.get(req.params.id)

  await promisify(Activity.add)(req.user.id, 'User', {
    action: 'UserUpdatedContactList',
    object_class: 'contact_list',
    object: updated.id
  })

  res.model(updated)
}

async function getLists(req, res) {
  if (req.query.users) {
    expect(req.query.users).to.be.an('array')
  }

  const result = await ContactList.getForBrand(
    getCurrentBrand(),
    req.query.users
  )
  res.collection(result)
}

async function getById(req, res) {
  const list_id = req.params.id
  expect(list_id).to.be.uuid

  const list = await ContactList.get(list_id)
  res.model(list)
}

async function remove(req, res) {
  expect(req.params.id).to.be.uuid

  const result = await ContactList.delete([req.params.id], req.user.id)

  if (result !== 1) {
    throw Error.ResourceNotFound(`Contact list ${req.params.id} not found.`)
  }

  res.status(204)
  res.end()
}

async function getFilterOptions(req, res) {
  const allTags = await ContactTag.getAll(req.user.id)
  const onlyTags = allTags.map(t => t.text)
  const filterOptions = {
    tag: {
      values: onlyTags,
      operator: 'all'
    }
  }

  res.model(filterOptions)
}

async function addManualMembers(req, res) {
  const list_id = req.params.id
  expect(list_id).to.be.uuid

  const contact_ids = req.body.contacts
  expect(contact_ids).to.be.an('array')

  await limitContactAccess(req.user.id, 'read', contact_ids)

  await ListMember.add(
    contact_ids.map(contact => ({
      contact,
      list: list_id,
      is_manual: true
    }))
  )

  res.status(204)
  res.end()
}

async function removeManualMembers(req, res) {
  const list_id = req.params.id
  expect(list_id).to.be.uuid

  const contact_ids = req.body.contacts
  expect(contact_ids).to.be.an('array')

  await limitContactAccess(req.user.id, 'read', contact_ids)

  await ListMember.remove(
    contact_ids.map(contact => ({
      contact,
      list: list_id,
      is_manual: true
    }))
  )

  res.status(204)
  res.end()
}

module.exports = app => {
  const auth = app.auth.bearer.middleware

  app.get('/contacts/lists', auth, am(getLists))
  app.get('/contacts/lists/options', auth, am(getFilterOptions))
  app.post('/contacts/lists', auth, am(create))
  app.get('/contacts/lists/:id', auth, access('read'), am(getById))
  app.put('/contacts/lists/:id', auth, access('write'), am(update))
  app.delete('/contacts/lists/:id', auth, access('write'), am(remove))

  app.post(
    '/contacts/lists/:id/members',
    auth,
    access('write'),
    am(addManualMembers)
  )
  app.delete(
    '/contacts/lists/:id/members',
    auth,
    access('write'),
    am(removeManualMembers)
  )
}
