const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const promisify = require('../../../lib/utils/promisify')

const buyer = {
  role: 'Buyer',
  legal_first_name: 'John',
  legal_middle_name: 'K',
  legal_last_name: 'Smith'
}

const seller = {
  role: 'Seller',
  legal_first_name: 'Dan',
  legal_last_name: 'Hogan'
}

const createDeal = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })
  Context.set({ brand })


  const deal = await DealHelper.create(user.id, brand.id, {
    roles: [
      buyer
    ],
    checklists: [{
      context: {}
    }]
  })

  return deal
}

const get = async () => {
  const deal = await createDeal()

  const role = await DealRole.get(deal.roles[0])

  expect(role).to.deep.include(buyer)
}


const add = async () => {
  const deal = await createDeal()

  const added = await Deal.addRole({
    ...seller,
    deal: deal.id,
    created_by: deal.created_by,
    checklist: deal.checklists[0]
  })

  const got = await DealRole.get(added)

  expect(got).to.deep.include(seller)
  expect(got.created_by).to.equal(deal.created_by)

  return got
}

const update = async() => {
  const role = await add()

  await Deal.updateRole({
    ...role,
    ...buyer
  })

  const updated = await DealRole.get(role.id)

  expect(updated).to.include(buyer)
}

const remove = async() => {
  const role = await add()

  await DealRole.delete(role.id)

  const deal = await promisify(Deal.get)(role.deal)

  expect(deal.roles).not.to.include(role.id)
}

const hideByTermination = async() => {
  const role = await add()

  const checklist = await DealChecklist.get(role.checklist)

  await DealChecklist.update({
    ...checklist,
    is_terminated: true
  })

  const deal = await promisify(Deal.get)(role.deal)

  expect(deal.roles).not.to.include(role.id)
}

describe('Deal Role', () => {
  createContext()

  it('add a deal role', add)
  it('get a deal role', get)
  it('update a deal role', update)
  it('delete a role and make sure its removed form deal', remove)
  it('should remove the role after the checklist is terminated', hideByTermination)
})
