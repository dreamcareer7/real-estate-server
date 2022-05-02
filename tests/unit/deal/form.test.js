const { expect } = require('chai')
const { createContext } = require('../helper')
const BrandHelper = require('../brand/helper')
const Form = require('../../../lib/models/Form')
const User = require('../../../lib/models/User/get')

const add = async (form = {}) => {
  const name = 'Test Form'
  const saved = await Form.create({
    name,
    ...form
  })

  expect(saved.name).to.equal(name)
  return saved
}

const update = async () => {
  const name = 'Updated Form'

  const saved = await add()

  const updated = await Form.update(saved.id, {
    name
  })

  expect(updated.name).to.equal(name)
}

const get = async () => {
  const saved = await add()
  const form = await Form.get(saved.id)

  expect(saved.id).to.equal(form.id)
  expect(saved.name).to.equal(form.name)
}

const getAll = async () => {
  const saved = await add()
  const forms = await Form.getAll()

  expect(forms).to.deep.include(saved)
}

const getByBrand = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const props = {
    roles: {
      Admin: [user.id],
    }
  }

  const brand1 = await BrandHelper.create(props)
  const brand2 = await BrandHelper.create(props)

  const brand1Form = await add({
    brand: brand1.id
  })

  const brandlessForm = await add()

  const brand1Forms = await Form.getByBrand(brand1.id)
  const brand2Forms = await Form.getByBrand(brand2.id)

  /* Brand 1 should have access to forms
   * that are specifically it's own or are not branded */
  expect(brand1Forms).to.deep.include(brandlessForm)
  expect(brand1Forms).to.deep.include(brand1Form)

  /* Brand 2 should have access to a brandles form
   * But should not have access to a branded form that belongs to another brand */
  expect(brand2Forms).to.deep.include(brandlessForm)
  expect(brand2Forms).not.to.deep.include(brand1Form)
}

describe('Deal Form', () => {
  createContext()

  it('should a add a form', add)
  it('should update a form', update)
  it('should get a form', get)
  it('should get a batch of forms', getAll)
  it('should get all available forms on a brand', getByBrand)
})
