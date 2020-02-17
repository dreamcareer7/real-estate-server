const expect = require('../../utils/validator').expect
const BrandRole = require('../../models/Brand/role')

const addRole = async (req, res) => {
  const role = req.body.role
  const acl = req.body.acl

  expect(role).to.be.a('string')
  expect(acl).to.be.an('array')

  const saved = await BrandRole.create({
    brand: req.params.id,
    role,
    acl
  })

  res.model(saved)
}

const updateRole = async (req, res) => {
  const id = req.params.rid
  const role = req.body.role
  const acl = req.body.acl

  expect(id).to.be.uuid
  expect(role).to.be.a('string')
  expect(acl).to.be.an('array')

  const saved = await BrandRole.update({
    id,
    role,
    acl
  })

  res.model(saved)
}

const getRoles = async (req, res) => {
  const roles = await BrandRole.getByBrand(req.params.id)

  res.model(roles)
}

const deleteRole = async (req, res) => {
  await BrandRole.delete(req.params.role)

  res.status(204)
  return res.end()
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/roles', b, access, am(addRole))
  app.put('/brands/:id/roles/:rid', b, access, am(updateRole))
  app.get('/brands/:id/roles', b, access, am(getRoles))
  app.delete('/brands/:id/roles/:role', b, access, am(deleteRole))

}

module.exports = router
