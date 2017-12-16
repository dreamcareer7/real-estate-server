const fs = require('fs')
const request = require('request-promise-native')
const config = require('../../lib/config')

const baseRequest = request.defaults({
  baseUrl: 'http://localhost:' + config.http.port + '/',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json'
  }
})
let authRequest, agentAuthRequest

const AGENT_MLS_ID = '0444075'

let status
try {
  status = JSON.parse(fs.readFileSync('./status.json', { encoding: 'utf-8' }))
}
catch(ex) {
  status = {}
}

function updateStatus(change) {
  Object.assign(status, change)
  fs.writeFileSync('./status.json', JSON.stringify(status, null, 4), { encoding: 'utf-8' })
}

main()

async function createAndLoginAgentUser(brand) {
  let agentUser
  try {
    agentUser = await checkLogin(false)
  }
  catch (ex) {
    console.log(ex.statusCode)
    if (ex.statusCode === 403) {
      agentUser = await createAgentUser({
        email_confirmed: true,
        brand: brand.id
      })

      return createAndLoginAgentUser()
    }

    throw ex
  }

  return agentUser
}

async function main() {
  const adminUser = await checkLogin(true)
  let brand = await createBrand()

  const agent = await findAgent(AGENT_MLS_ID)
  const office = await findOffice(agent.office_mlsid)
  
  brand = await addOfficeToBrand(brand, office)

  const agentUser = await createAndLoginAgentUser(brand)
  await fixUserBrand(agentUser, brand, agentAuthRequest)
  await fixUserBrand(adminUser, brand, authRequest)
  await upgradeUserToAgent(agentUser, agent)

  const roleDeal = await addRoleToBrand(brand, 'Deals', ['Deals'])
  await addMemberToRole(brand, roleDeal, agentUser)

  await addBackOfficeAclToAdminRole(brand)
}

async function checkLogin(admin) {
  const token = admin ? status.token : status.agent_token
  const loginFn = admin ? loginAdmin : loginAgent

  if (token) {
    const req = baseRequest.defaults({
      headers: {
        Authorization: 'Bearer ' + token
      }
    })

    try {
      const resp = await req({
        uri: '/users/self',
        method: 'GET',
        json: true
      })

      if (admin)
        authRequest = req
      else
        agentAuthRequest = req

      console.log((admin ? 'Admin' : 'Agent') + ' token is valid. skipping login...')
      return Promise.resolve(resp.data)
    }
    catch (ex) {
      if (ex.statusCode === 401)
        return loginFn()

      throw ex
    }
  }

  return loginFn()
}

async function loginAdmin() {
  const data = JSON.parse(fs.readFileSync('./data/loginAdmin.json', { encoding: 'utf-8' }))

  const resp = await baseRequest(data)
  authRequest = baseRequest.defaults({
    headers: {
      Authorization: 'Bearer ' + resp.access_token
    }
  })
  updateStatus({
    token: resp.access_token
  })

  console.log('Admin login success!')

  return resp.data
}

async function loginAgent() {
  const data = JSON.parse(fs.readFileSync('./data/loginAgent.json', { encoding: 'utf-8' }))

  const resp = await baseRequest(data)
  agentAuthRequest = baseRequest.defaults({
    headers: {
      Authorization: 'Bearer ' + resp.access_token
    }
  })
  updateStatus({
    agent_token: resp.access_token
  })

  console.log('Agent login success!')

  return resp
}

async function createAgentUser(data) {
  const options = JSON.parse(fs.readFileSync('./data/createAgentUser.json', { encoding: 'utf-8' }))
  Object.assign(options.body, data)

  const resp = await authRequest(options)
  console.log('Created agent user', resp.data.id)

  return resp.data
}

async function fixUserBrand(user, brand, req) {
  if (!user.brand) {
    const resp = await req({
      uri: '/users/self',
      method: 'PUT',
      json: true,
      body: {
        brand: brand.id
      }
    })

    console.log('Fixed user attributes.')
    return resp
  }
  
  console.log(`User brand is already set for ${user.display_name}.`)

  return {
    code: 'OK',
    data: user
  }
}

async function upgradeUserToAgent(user, agent) {
  if (user.user_type === 'Agent' && typeof user.agent === 'object') {
    console.log(`User ${user.display_name} already upgraded to agent.`)
    return Promise.resolve({
      code: 'OK',
      data: user
    })
  }

  const resp = await agentAuthRequest({
    uri: '/users/self/upgrade',
    body: {
      agent: agent.id,
      secret: agent.email,
    },
    method: 'PATCH',
    json: true
  })

  console.log('User upgraded to agent.')
  return resp
}

async function createBrand() {
  if (status.brand_id) {
    const brand = await authRequest({
      uri: `/brands/${status.brand_id}`,
      json: true,
      method: 'GET'
    })

    console.log('Loaded brand', brand.data.id)
    return brand.data
  }

  const options = JSON.parse(fs.readFileSync('./data/createBrand.json', { encoding: 'utf-8' }))  
  const resp = await authRequest(options)
  console.log('Created brand', resp.data.id)
  updateStatus({
    brand_id: resp.data.id
  })

  return resp.data
}

async function findAgent(mlsid) {
  return (await authRequest({
    uri: '/agents/search',
    qs: {
      mlsid
    },
    method: 'GET',
    json: true
  })).data
}

async function findOffice(mlsid) {
  return (await authRequest({
    uri: '/offices/search',
    qs: {
      mlsid
    },
    method: 'GET',
    json: true
  })).data
}

async function addOfficeToBrand(brand, office) {
  if (brand.offices.find(mlsid => mlsid === office.mls_id)) {
    console.log('Office already added to brand.')
    return brand
  }

  const resp = await authRequest({
    uri: `/brands/${brand.id}/offices`,
    body: {
      office: office.id
    },
    method: 'POST',
    json: true
  })

  console.log(`Added office ${office.id} to brand.`)

  return resp.data
}

function getBrandRoles(brand) {
  return authRequest({
    uri: `/brands/${brand.id}/roles`,
    method: 'GET',
    json: true
  })
}

async function addBackOfficeAclToAdminRole(brand) {
  const roles = (await getBrandRoles(brand)).data

  const adminRole = roles.find(role => role.role === 'Admin')

  if (adminRole.acl.includes('BackOffice')) {
    console.log('Admin role already has BackOffice access')
    return adminRole
  }

  const resp = await authRequest({
    uri: `/brands/${brand.id}/roles/${adminRole.id}`,
    method: 'PUT',
    json: true,
    body: Object.assign(adminRole, {
      acl: ['*', 'BackOffice']
    })
  })

  console.log('BackOffice access added to Admin role.')
  return resp.data
}

async function addRoleToBrand(brand, title, acl) {
  const roles = (await getBrandRoles(brand)).data

  const found = roles.find(role => role.role === title)
  if (found) {
    console.log(`Role ${title} is already added to this brand.`)
    return found
  }

  const resp = await authRequest({
    uri: `/brands/${brand.id}/roles`,
    method: 'POST',
    body: {
      role: title,
      acl: acl
    },
    json: true
  })

  console.log(`Role ${title} added to brand with acl ${acl}.`)

  return resp.data
}

function getRoleMembers(brand, role) {
  return authRequest({
    uri: `/brands/${brand.id}/roles/${role.id}/members`,
    method: 'GET',
    json: true
  })
}

async function addMemberToRole(brand, role, user) {
  const members = (await getRoleMembers(brand, role)).data

  console.log(`Role ${role.role} members are`, members.length)

  if (members.find(member => member.id === user.id)) {
    console.log(`User ${user.display_name} is already a member of ${role.role} role in brand.`)
    return
  }

  const resp = await authRequest({
    uri: `/brands/${brand.id}/roles/${role.id}/members`,
    method: 'POST',
    json: true,
    body: {
      users: [user.id]
    }
  })

  console.log(`Added user to the ${role.role} role in the brand.`)

  return resp
}