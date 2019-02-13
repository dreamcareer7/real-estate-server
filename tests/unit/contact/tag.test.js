const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const AttributeDef = require('../../../lib/models/Contact/attribute_def')
const ContactList = require('../../../lib/models/Contact/list')
const ListMember = require('../../../lib/models/Contact/list_members')
const ContactTag = require('../../../lib/models/Contact/tag')
const Context = require('../../../lib/models/Context')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')

let user, brand

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    checklists: [],
    contexts: []
  })
  Context.set({ user, brand })
}

async function createContacts() {
  const ids = await Contact.create(
    [
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Abbas'
          },
          {
            attribute_type: 'email',
            text: 'abbas@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag1'
          },
          {
            attribute_type: 'tag',
            text: 'Tag2'
          }
        ]
      },
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Emil'
          },
          {
            attribute_type: 'email',
            text: 'emil@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag2'
          }
        ]
      },
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Nasser'
          },
          {
            attribute_type: 'email',
            text: 'naser@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag3'
          }
        ]
      }
    ],
    user.id,
    brand.id,
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return ids
}

async function testAutoTagCreateWithNewContacts() {
  await createContacts()
  const tags = await ContactTag.getAll(brand.id)

  expect(tags).to.have.length(3)
  expect(tags.map(t => t.tag)).to.have.members(['Tag1', 'Tag2', 'Tag3'])
}

async function testAutoTagCreateWithUpdatedContacts() {
  const ids = await createContacts()

  Orm.setEnabledAssociations(['contact.attributes'])

  const raw = await Contact.get(ids[0])
  const populated = await Orm.populate({
    models: [ raw ],
    associations: ['contact.attributes']
  })
  const contact = populated[0]
  const tag_attr = contact.attributes.find(a => a.attribute_type === 'tag')

  await Contact.update(user.id, brand.id, [{
    id: ids[0],
    attributes: [{
      ...tag_attr,
      text: 'Tag4'
    }]
  }])

  const tags = await ContactTag.getAll(brand.id)

  expect(tags).to.have.length(4)
  expect(tags.map(t => t.tag)).to.have.members(['Tag1', 'Tag2', 'Tag3', 'Tag4'])
}

async function testRenameTag() {
  async function renameTag2() {
    await ContactTag.rename(brand.id, user.id, 'Tag2', 'Tag0')
    await handleJobs()
  }

  async function checkFilter() {
    const { total } = await Contact.filter(brand.id, [{
      attribute_type: 'tag',
      value: 'Tag0'
    }], {})

    expect(total).to.be.eq(2)
  }

  async function checkFastFilter() {
    const { total } = await Contact.fastFilter(brand.id, [{
      attribute_type: 'tag',
      value: 'Tag0'
    }], {})

    expect(total).to.be.eq(2)
  }

  async function checkTags() {
    const tags = await ContactTag.getAll(brand.id)

    expect(tags).to.have.length(3)
    expect(tags.map(t => t.tag)).to.have.members(['Tag0', 'Tag1', 'Tag3'])
  }

  await createContacts()
  await renameTag2()

  await checkFilter()
  await checkFastFilter()
  await checkTags()
}

async function testRenameTagFixesListFilters() {
  let list_id

  async function setTheStage() {
    const def_ids_by_name = await AttributeDef.getDefsByName(brand.id)
  
    await createContacts()
    list_id = await ContactList.create(user.id, brand.id, {
      name: 'Test List',
      filters: [{
        attribute_def: def_ids_by_name.get('tag'),
        value: 'Tag2'
      }]
    })
    await handleJobs()
  }

  async function renameTag2() {
    await ContactTag.rename(brand.id, user.id, 'Tag2', 'Tag0')
    await handleJobs()
  }

  async function checkList() {
    const list = await ContactList.get(list_id)
    expect(list.filters[0].value).to.be.equal('Tag0')
    expect(list.member_count).to.be.equal(2)
  }

  async function checkListMembers() {
    const members = await ListMember.findByListId(list_id)

    expect(members).to.have.length(2)
  }

  await setTheStage()
  await renameTag2()
  await checkList()
  await checkListMembers()
}

async function testCreateTagManually() {
  await ContactTag.create(brand.id, user.id, 'Tag0')

  const tags = await ContactTag.getAll(brand.id)

  expect(tags).to.have.length(1)
  expect(tags.map(t => t.tag)).to.have.members(['Tag0'])
}

async function testDeleteTag() {
  async function checkFilter() {
    const { total } = await Contact.filter(brand.id, [{
      attribute_type: 'tag',
      value: 'Tag2'
    }], {})

    expect(total).to.be.eq(0)
  }

  async function checkFastFilter() {
    const { total } = await Contact.fastFilter(brand.id, [{
      attribute_type: 'tag',
      value: 'Tag2'
    }], {})

    expect(total).to.be.eq(0)
  }

  async function checkTags() {
    const tags = await ContactTag.getAll(brand.id)

    expect(tags).to.have.length(2)
    expect(tags.map(t => t.tag)).to.have.members(['Tag1', 'Tag3'])
  }

  await createContacts()
  await ContactTag.delete(brand.id, user.id, ['Tag2'], true)
  await handleJobs()

  await checkFilter()
  await checkFastFilter()
  await checkTags()
}

function testCreateDuplicateTagFail(done) {
  ContactTag.create(brand.id, user.id, 'Tag0').then(() => {
    return ContactTag.create(brand.id, user.id, 'Tag0')
  }).then(
    () => {
      done(new Error('Creating duplicate tag did not throw an error!'))
    },
    () => done()
  )
}

function testRenameToExistingTagFail(done) {
  (async function() {
    await ContactTag.create(brand.id, user.id, 'Tag1')
    await ContactTag.create(brand.id, user.id, 'Tag2')
  })().then(
    () => ContactTag.rename(brand.id, user.id, 'Tag1', 'Tag2'),
    done
  ).then(
    () => done(new Error('Renaming to an existing tag did not throw an error!')),
    () => done()
  )
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Tag', () => {
    it('should create tags implicitly after contacts are created', testAutoTagCreateWithNewContacts)
    it('should create tags implicitly after contacts are updated', testAutoTagCreateWithUpdatedContacts)
    it('should allow creating a tag manually', testCreateTagManually)
    it('should update contact tags after a tag is renamed', testRenameTag)
    it('should update list filters and members after a tag is renamed', testRenameTagFixesListFilters)
    it('should delete tags globally', testDeleteTag)

    it('should not allow creating a duplicate tag', testCreateDuplicateTagFail)
    it('should not allow renaming to an existing tag', testRenameToExistingTagFail)
  })
})
