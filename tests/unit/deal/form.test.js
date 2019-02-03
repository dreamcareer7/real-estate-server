const { expect } = require('chai')
const { createContext } = require('../helper')

const add = async () => {
  const name = 'Test Form'
  const saved = await Form.create({
    name
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

const getAllForms = async () => {
  const saved = await add()
  const forms = await Form.getAllForms()

  expect(forms).to.deep.include(saved)
}

describe('Deal Form', () => {
  createContext()

  it('should a add a form', add)
  it('should update a form', update)
  it('should get a form', get)
  it('should get a batch of forms', getAll)
  it('should get all available forms', getAllForms)
})
