const config = require('../../lib/config.js')
const dataUser = require('./suites/data/user.js')

const users = new Map()

function createUser({ email }) {
  return cb => frisby.create(`create user with email ${email}`)
    .post('/users', {
      ...dataUser,
      email,
      client_id: config.tests.client_id,
      client_secret: config.tests.client_secret,
    })
    .after((err, res, body) => {
      users.set(email, { ...res, password: dataUser.password })
      cb(err, res, body)
    })
    .expectStatus(201)
}

/**
 * @param {string} description 
 * @param {unknown[]} brands 
 * @param {(response: unknown) => UUID} getActiveBrand
 */
function createBrands(description, brands, getActiveBrand) {
  return cb => frisby.create(description)
    .post('/_/brands?associations[]=brand.children', brands)
    .after((err, res, json) => {
      if (getActiveBrand) {
        const activeBrand = getActiveBrand(json)
        if (activeBrand) {
          const setup = frisby.globalSetup()
          setup.request.headers['X-Rechat-Brand'] = activeBrand
          frisby.globalSetup(setup)      
        }
      }
      cb(err, res, json)
    })
    .expectStatus(200)
}

function beforeFrisby(fn, doBefore) {
  return cb => {
    doBefore()
    return fn(cb)
  }
}

/**
 * @template F
 * @param {F} fns 
 * @returns {F}
 */
function beforeFirstFrisby(fns, doBefore) {
  const [k, fn] = Object.entries(fns)[0]
  fns[k] = beforeFrisby(fn, doBefore)

  return fns
}

function afterFrisby(fn, doAfter) {
  return cb => fn(cb).after(doAfter)
}

/**
 * @template F
 * @param {F} fns 
 * @returns {F}
 */
function afterLastFrisby(fns, doAfter) {
  const entries = Object.entries(fns)
  const [k, fn] = entries[entries.length - 1]
  fns[k] = afterFrisby(fn, doAfter)

  return fns
}

/**
 * @template F
 * @param {() => UUID} brandFn 
 * @param {F} fns 
 * @returns {F}
 */
function switchBrand(brandFn, fns) {
  return beforeFirstFrisby(fns, () => {
    const setup = frisby.globalSetup()
    setup.request.headers['X-Rechat-Brand'] = brandFn()
    frisby.globalSetup(setup)

    return fns
  })
}

function getToken(email, cb) {
  const user = users.get(email) ?? dataUser

  const auth_params = {
    client_id: config.tests.client_id,
    client_secret: config.tests.client_secret,
    username: email,
    password: user.password,
    grant_type: 'password'
  }

  return frisby.create(`login as ${email}`)
    .post('/oauth2/token', auth_params)
    .expectStatus(200)
    .after((err, res, body) => {
      user.access_token = body.access_token
      cb(err, res, body)
    })
}

function dummy(description, fn) {
  return cb => frisby.create(description)
    .get('/_/dummy')
    .after((err, res, json) => {
      fn()
      cb(err, res, json)
    })
}

function runAsUser(email, fns) {
  function setToken(token) {
    const setup = frisby.globalSetup()

    const originalAuthorizationHeader = setup.request.headers['Authorization']
    setup.request.headers['Authorization'] = 'Bearer ' + token

    frisby.globalSetup(setup)

    return () => {
      const setup = frisby.globalSetup()
      setup.request.headers['Authorization'] = originalAuthorizationHeader
      frisby.globalSetup(setup)  
    }
  }

  let revertAuthorizationHeader = () => {}
  const token = cb => getToken(email, (err, res, json) => {
    revertAuthorizationHeader = setToken(json.access_token)
    cb(err, res, json)
  })

  const user = users.get(email) ?? dataUser

  if (user.access_token) {
    revertAuthorizationHeader = setToken(user.access_token)
    return afterLastFrisby(fns, () => revertAuthorizationHeader())
  } else {
    afterLastFrisby(fns, () => revertAuthorizationHeader())
    return {
      [`login_${email}`]: token,
      ...fns,
    }
  }
}

module.exports = {
  createBrands,
  createUser,
  runAsUser,
  switchBrand,
}
