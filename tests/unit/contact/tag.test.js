const { expect } = require('chai')
const zip = require('lodash/zip')

const { createContext, handleJobs } = require('../helper')

const Contact = {
  ...require('../../../lib/models/Contact/fast_filter'),
  ...require('../../../lib/models/Contact/manipulate'),
  ...require('../../../lib/models/Contact/filter'),
  ...require('../../../lib/models/Contact/get'),
}
const AttributeDef = require('../../../lib/models/Contact/attribute_def/get')
const ContactList = require('../../../lib/models/Contact/list')
const ListMember = require('../../../lib/models/Contact/list/members')
const ContactTag = require('../../../lib/models/Contact/tag')
const Context = require('../../../lib/models/Context')
const Orm = {
  ...require('../../../lib/models/Orm/index'),
  ...require('../../../lib/models/Orm/context'),
}
const User = require('../../../lib/models/User/get')

const BrandHelper = require('../brand/helper')
const ContactHelper = require('../contact/helper')

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

  await handleJobs()
}

async function testCheckDefaultTags() {
  const DEFAULT_TAGS = [
    'Warm',
    'Hot',
    'Past Client',
    'Seller',
    'Agent',
    'Buyer'
  ]

  const tags = await ContactTag.getAll(brand.id)

  expect(tags.map(t => t.tag)).to.have.members(DEFAULT_TAGS)
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
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return ids
}

async function testAutoTagCreateWithNewContacts() {
  await createContacts()
  const tags = await ContactTag.getAll(brand.id)

  expect(tags).to.have.length(9)
  expect(tags.map(t => t.tag)).to.include.members(['Tag1', 'Tag2', 'Tag3'])
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

  await Contact.update([{
    id: ids[0],
    attributes: [{
      ...tag_attr,
      text: 'Tag4'
    }]
  }], user.id, brand.id)

  const tags = await ContactTag.getAll(brand.id)

  expect(tags).to.have.length(10)
  expect(tags.map(t => t.tag)).to.include.members(['Tag1', 'Tag2', 'Tag3', 'Tag4'])
}

async function testRenameTag() {
  async function renameTag2() {
    await ContactTag.rename(brand.id, user.id, 'Tag2', 'Tag0')
    await handleJobs()
  }

  async function checkFilter() {
    const { total } = await Contact.filter(brand.id, user.id, [{
      attribute_type: 'tag',
      value: 'Tag0'
    }], {})

    expect(total).to.be.eq(2)
  }

  async function checkFastFilter() {
    const { total } = await Contact.fastFilter(brand.id, user.id, [{
      attribute_type: 'tag',
      value: 'Tag0'
    }], {})

    expect(total).to.be.eq(2)
  }

  async function checkTags() {
    const tags = await ContactTag.getAll(brand.id)

    expect(tags).to.have.length(9)
    expect(tags.map(t => t.tag)).to.include.members(['Tag0', 'Tag1', 'Tag3'])
  }

  await createContacts()
  await renameTag2()

  await checkFilter()
  await checkFastFilter()
  await checkTags()
}

async function testChangeTagLetterCase() {
  async function renameTag2() {
    await ContactTag.rename(brand.id, user.id, 'Tag2', 'tag2')
    await handleJobs()
  }

  async function checkTags() {
    const tags = await ContactTag.getAll(brand.id)

    expect(tags).to.have.length(9)
    expect(tags.map(t => t.tag)).to.include.members(['tag2', 'Tag1', 'Tag3'])
    expect(tags.map(t => t.tag)).not.to.include.members(['Tag2'])
  }

  await createContacts()
  await renameTag2()
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
  await ContactTag.create(brand.id, user.id, 'Tag0', null)

  const tags = await ContactTag.getAll(brand.id)

  expect(tags).to.have.length(7)
  expect(tags.map(t => t.tag)).to.include.members(['Tag0'])
}

async function testDeleteTag() {
  async function checkFilter() {
    const { total } = await Contact.filter(brand.id, user.id, [{
      attribute_type: 'tag',
      value: 'Tag2'
    }], {})

    expect(total).to.be.eq(0)
  }

  async function checkFastFilter() {
    const { total } = await Contact.fastFilter(brand.id, user.id, [{
      attribute_type: 'tag',
      value: 'Tag2'
    }], {})

    expect(total).to.be.eq(0)
  }

  async function checkTags() {
    const tags = await ContactTag.getAll(brand.id)

    expect(tags).to.have.length(8)
    expect(tags.map(t => t.tag)).not.to.have.include(['Tag2'])
  }

  await createContacts()
  await ContactTag.delete(brand.id, user.id, ['Tag2'], true)
  await handleJobs()

  await checkFilter()
  await checkFastFilter()
  await checkTags()
}

async function testAddBackDeletedTag() {
  await ContactTag.create(brand.id, user.id, 'Tag0', null)
  await ContactTag.delete(brand.id, user.id, ['Tag0'])

  await ContactTag.create(brand.id, user.id, 'Tag0', null)

  const tags = await ContactTag.getAll(brand.id)

  expect(tags).to.have.length(7)
  expect(tags.map(t => t.tag)).to.include.members(['Tag0'])
}

async function testAddExistingTagsToContacts() {
  await Contact.create([{
    user: user.id,
    attributes: ContactHelper.attributes({
      first_name: 'John',
      last_name: 'Doe',
      tag: ['Warm']
    })
  }], user.id, brand.id)

  await handleJobs()
}

async function testAddBackDeletedTagByUsingInContact() {
  const [id] = await Contact.create([{
    user: user.id,
    attributes: ContactHelper.attributes({
      first_name: 'John',
      last_name: 'Doe',
      tag: ['Tag0']
    })
  }], user.id, brand.id)

  await ContactTag.delete(brand.id, user.id, ['Tag0'])

  await Contact.update([{
    id,
    attributes: ContactHelper.attributes({ tag: ['Tag0' ]})
  }], user.id, brand.id)

  const tags = await ContactTag.getAll(brand.id)

  expect(tags).to.have.length(7)
  expect(tags.map(t => t.tag)).to.include.members(['Tag0'])
}

async function testRenameTagToDeletedTag() {
  await Contact.create([{
    user: user.id,
    attributes: ContactHelper.attributes({
      first_name: 'John',
      last_name: 'Doe',
    })
  }], user.id, brand.id)

  await ContactTag.create(
    brand.id,
    user.id,
    'Tag0',
    120,
    false
  )

  await ContactTag.create(
    brand.id,
    user.id,
    'Tag1',
    100,
    false
  )

  await ContactTag.delete(brand.id, user.id, ['Tag0'])


  await ContactTag.rename(brand.id, user.id, 'Tag1', 'Tag0')

  const tags = await ContactTag.getAll(brand.id)
  expect(tags).to.have.length(7)
  expect(tags.map(t => t.tag)).to.include.members(['Tag0'])
}



function testCreateDuplicateTagFail(done) {
  ContactTag.create(brand.id, user.id, 'Tag0', null).then(() => {
    return ContactTag.create(brand.id, user.id, 'tag0', null)
  }).then(
    () => {
      done(new Error('Creating duplicate tag did not throw an error!'))
    },
    () => done()
  )
}

function testCreateEmptyTagFail(done) {
  ContactTag.create(brand.id, user.id, '', null).then(
    () => {
      done(new Error('Creating empty tag did not throw an error!'))
    },
    () => done()
  )
}

async function testRenameToExistingTagDoesMerge() {
  await ContactTag.create(brand.id, user.id, 'Tag1', null)
  await ContactTag.create(brand.id, user.id, 'Tag2', null)

  await ContactTag.rename(brand.id, user.id, 'Tag1', 'Tag2')

  const tags = await ContactTag.getAll(brand.id)
  expect(tags).to.have.length(7)
  expect(tags.map(t => t.tag)).to.include.members(['Tag2'])
  expect(tags.map(t => t.tag)).not.to.include.members(['Tag1'])
}

function testRenameToEmptyTagFail(done) {
  ContactTag.create(brand.id, user.id, 'Tag1', null).then(
    () => ContactTag.rename(brand.id, user.id, 'Tag1', ''),
    done
  ).then(
    () => done(new Error('Renaming to an existing tag to empty string did not throw an error!')),
    () => done()
  )
}

/**
 * @param {object} opts
 * @param {string[][]} opts.initialTags
 * @param {string[]} opts.newTags
 * @param {string[][]} opts.expectedTags
 * @param {boolean} opts.shouldDelete
 */
async function testUpdateTags({ initialTags, newTags, expectedTags, shouldDelete }) {
  const contactInfos = initialTags.map(tags => ({
    attributes: tags.map(t => ({ attribute_type: 'tag', text: t })),
    brand: brand.id,
    user: user.id,
  }))

  const contactIds = await Contact.create(contactInfos, user.id, brand.id)
  await Contact.updateTags(contactIds, newTags, user.id, brand.id, shouldDelete)

  for (const [idx, [cid, et]] of zip(contactIds, expectedTags).entries()) {
    /** @type {string[]} */
    const actualTags = /** @type {any} */((await Contact.get(cid)).tags)

    expect(actualTags, `Contact [${idx}] has not expected tags after update`)
      .to.have.lengthOf(et?.length ?? 0)
      .and.same.members(et ?? [])
  }
}

async function testUniqNewTags () {
  for (const shouldDelete of [false, true]) {
    await testUpdateTags({
      shouldDelete,
      initialTags: [[]],
      newTags: ['tag3', 'tag1', 'Tag1', 'tag2', ' Tag1  ', '\tTaG1', 'tAg1'],
      expectedTags: [['tag3', 'tag1', 'tag2']],
    })
  }
}

async function testNotToCreateDuplicateTags () {
  await testUpdateTags({
    shouldDelete: true,
    initialTags: [
      ['Dup1', 'Common', 'Dup2'],
      ['Dup1', 'Common', 'Dup3'],
    ],
    newTags: ['Dup1'],
    expectedTags: [
      ['Dup1', 'Dup2'],
      ['Dup1', 'Dup3'],
    ],
  })
}

async function testFixCase () {
  await testUpdateTags({
    shouldDelete: true,
    initialTags: [
      ['TAG1', 'Tag2'],
      ['tAg1', 'tag3'],
    ],
    newTags: ['Tag1'],
    expectedTags: [
      ['Tag1', 'Tag2'],
      ['Tag1', 'tag3'],
    ],
  })
}

async function testDedupeTagsUpdating () {
  await testUpdateTags({
    shouldDelete: true,
    initialTags: [
      ['indie1', 'uniq1', 'Uniq1', ' UNIQ1  ', 'CoMMon', 'common', 'Common  ', 'common2'],
      ['indie2', 'uniq2', 'UniQ2 ', 'common', 'cOmmOn', 'CoMMon', 'Common  ', ' Common ', 'common2'],
    ],
    newTags: ['uniq1', 'common', 'Uniq2'],
    expectedTags: [
      ['indie1', 'uniq1', 'common', 'Uniq2'],
      ['indie2', 'uniq1', 'common', 'Uniq2'],
    ],
  })
}

async function testDedupeTagsExisting () {
  /* XXX: this isn't a useful feature though. it was only added accidentally by
   * me and I've kept it, because it's usable in a migration script. */
  await testUpdateTags({
    shouldDelete: true,
    initialTags: [
      [' Tag1 ', ' Tag1 ', 'TAG1'],
      ['\ttag2\t', '\ttag2\t', 'TAG2'],
    ],
    newTags: ['tag3'],
    expectedTags: [
      [' Tag1 ', 'TAG1', 'tag3'],
      ['\ttag2\t', 'TAG2', 'tag3'],
    ],
  })
}

async function testNotToAddDuplicateTags () {
  await testUpdateTags({
    shouldDelete: false,
    initialTags: [
      ['  Dup1 ', 'DUP1 ', 'Common', 'Tag2'],
      ['dup1', 'Common', 'Tag3'],
      ['Common', 'Tag4'],
    ],
    newTags: ['dup1', 'Dup1', 'DUP1'],
    expectedTags: [
      ['  Dup1 ', 'DUP1 ', 'Common', 'Tag2'],
      ['dup1', 'Common', 'Tag3'],
      ['dup1', 'Common', 'Tag4'],
    ]
  })
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Tag', () => {
    it('should create default tags on brand creation', testCheckDefaultTags)
    it('should create tags implicitly after contacts are created', testAutoTagCreateWithNewContacts)
    it('should create tags implicitly after contacts are updated', testAutoTagCreateWithUpdatedContacts)
    it('should allow creating a tag manually', testCreateTagManually)
    it('should update contact tags after a tag is renamed', testRenameTag)
    it('should update letter-case for tags', testChangeTagLetterCase)
    it('should update list filters and members after a tag is renamed', testRenameTagFixesListFilters)
    it('should delete tags globally', testDeleteTag)
    it('should allow adding back a deleted tag', testAddBackDeletedTag)
    it('should allow renaming a tag to a deleted tag', testRenameTagToDeletedTag)
    it('should allow adding back a deleted tag by using it in a contact', testAddBackDeletedTagByUsingInContact)

    // Duplicate tag
    it('should allow trigger to work', testAddExistingTagsToContacts)
    it('should merge when renaming to an existing tag', testRenameToExistingTagDoesMerge)
    it('should not allow creating a duplicate tag', testCreateDuplicateTagFail)

    // Empty tag
    it('should not allow creating an empty tag', testCreateEmptyTagFail)
    it('should not allow renaming to empty tag', testRenameToEmptyTagFail)
  })

  describe('updateTags', () => {
    it('ignores duplicate tags in newTags (case-insensitive, trimmed)', testUniqNewTags)

    context('when replacing tags... (shouldDelete = true)', () => {
      it('doesn\'t create duplicate tags', testNotToCreateDuplicateTags)
      it('fixes text case', testFixCase)
      it('dedupes existing tags when updating them (case-insensitive, trimmed)', testDedupeTagsUpdating)
      it('dedupes existing non-updating tags (case-sensitive)', testDedupeTagsExisting)
    })

    context('when adding new tags... (shouldDelete = false)', () => {
      it('adds only new unique tags (case-insensitive, trimmed)', testNotToAddDuplicateTags)
    })
  })
})
