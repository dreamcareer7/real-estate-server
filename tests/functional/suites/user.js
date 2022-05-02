const { createBrands, switchBrand } = require('../util')

const brandSetup = [
  {
    name: 'Manhattan',
    brand_type: 'Region',
    roles: {
      Admin: ['test@rechat.com'],
    },
    contexts: [],
    checklists: [],
    property_types: [],
    children: [
      {
        name: '140 Franklin',
        brand_type: 'Office',
        roles: {
          Admin: ['test@rechat.com'],
        },
        contexts: [],
        checklists: [],
        property_types: [],
        children: [
          {
            name: 'John Doe\'s Team',
            brand_type: 'Team',
            roles: {
              Agent: {
                acl: ['CRM', 'Deals'],
                members: ['test+email@rechat.com']
              },
            },
            contexts: [],
            checklists: [],
            property_types: [],
          }
        ]  
      },
    ]
  }, {
    name: 'Brooklyn',
    brand_type: 'Region',
    roles: {
      Admin: ['test@rechat.com'],
    },
    contexts: [],
    checklists: [],
    property_types: [],
  }
]

const config = require('../../../lib/config.js')
const user = require('./data/user.js')
const uuid = require('uuid')
const password = config.tests.password

const user_response = require('./expected_objects/user.js')
const email_sign_img_response = require('./expected_objects/img_upload/email_sign_img.js')
const user_cover_img_response = require('./expected_objects/img_upload/user_cover_img.js')

const path = require('path')
const fs = require('fs')

const client = JSON.parse(JSON.stringify(user))

client.client_id = config.tests.client_id
client.client_secret = config.tests.client_secret

registerSuite('agent', ['add', 'getByMlsId'])

const lookupExpect404 = (cb) => {
  return frisby.create('lookup login methods and expect 404')
    .post('/users/lookup', {
      email: user.email,
      client_id: config.tests.client_id,
      client_secret: config.tests.client_secret
    })
    .after(cb)
    .expectStatus(404)
}

const create = (cb) => {
  return frisby.create('create user')
    .post('/users', client)
    .after(cb)
    .expectStatus(201)
    .expectJSONTypes({
      code: String,
      data: user_response
    })
}

const create401 = (cb) => {
  return frisby.create('expect 401 with empty model')
    .post('/users')
    .after(cb)
    .expectStatus(401)
}

const getUser = (cb) => {
  return frisby.create('get user')
    .get('/users/' + results.user.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.user.create.data
    })
    .expectJSONTypes({
      code: String,
      data: user_response
    })
}

const getUserRoles = (cb) => {
  return frisby.create('get user roles across different brands')
    .get('/users/self/roles')
    .after(cb)
    .expectStatus(200)
}

const getUser404 = (cb) => {
  return frisby.create('expect 404 with invalid user id when getting a user')
    .get('/users/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const lookupExpectPassword = (cb) => {
  return frisby.create('lookup login methods and expect password login')
    .post('/users/lookup', {
      email: results.user.create.data.email,
      client_id: config.tests.client_id,
      client_secret: config.tests.client_secret
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [],
      info: {
        password: true
      }
    })
}

const update = (cb) => {
  const updatedUser = JSON.parse(JSON.stringify(results.authorize.token.data))
  updatedUser.first_name = 'updated first name'
  updatedUser.password = password
  updatedUser.email_signature = 'my signature'

  return frisby.create('update user')
    .put('/users/self', updatedUser)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      code: String,
      data: user_response,
    })
    .expectJSON({
      code: 'OK',
      data: {
        id: results.authorize.token.data.id,
        type: 'user',
        is_shadow: results.authorize.token.data.is_shadow
      }
    })
}

const updateEmailSignPic = (cb) => {
  const signature = 'Here is my great signature'

  return frisby.create('update email signature pic')
    .put('/users/self', {
      email_signature: signature
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        id: results.authorize.token.data.id,
        type: 'user',
        email_signature: signature
      }
    })
}

const changePassword = (cb) => {
  return frisby.create('change password of a user')
    .patch('/users/self/password', {
      old_password: password,
      new_password: 'aaaaaa'
    })
    .after(cb)
    .expectStatus(200)
}

const changePassword401 = (cb) => {
  return frisby.create('expect 400 with empty model when changing password of a user')
    .patch('/users/self/password')
    .after(cb)
    .expectStatus(400)
}

const resetPassword = (cb) => {
  return frisby.create('initiate password reset')
    .post('/users/reset_password', {email: user.email})
    .after(cb)
    .expectStatus(204)
}

const resetPassword404 = (cb) => {
  return frisby.create('expect 404 with invalid email when initiating password reset')
    .post('/users/reset_password', {email: 'invalid email'})
    .after(cb)
    .expectStatus(404)
}

const patchUserTimeZone = (cb) => {
  return frisby.create('change timezone setting for a user')
    .patch('/users/self/timezone', {time_zone: results.user.create.data.timezone})
    .after(cb)
    .expectJSON({
      data: {
        timezone: results.user.create.data.timezone
      }
    })
    .expectStatus(200)
}

const addInvalidActivityByAction = (cb) => {
  return frisby.create('record an activity by invalid action')
    .post('/users/self/timeline', {
      action: 'BombasticActivity',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityByType = (cb) => {
  return frisby.create('record an activity by invalid type')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object_class: 'bombastic_call',
      object: {
        type: 'bombastic_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityActionMissing = (cb) => {
  return frisby.create('record an activity when action is missing')
    .post('/users/self/timeline', {
      object_class: 'UserCalledContact',
      object: {
        type: 'phone_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityObjectClassMissing = (cb) => {
  return frisby.create('record an activity when object class is missing')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object: {
        type: 'phone_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityObjectMissing = (cb) => {
  return frisby.create('record an activity when object is missing')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object_class: 'phone_call',
    })
    .after(cb)
    .expectStatus(400)
}

const addActivity = (cb) => {
  return frisby.create('record activity for user')
    .post('/users/self/timeline', {
      action: 'UserOpenedIOSApp',
      object_class: 'ios_app',
      object: {
        type: 'ios_app',
        version: '0.0.0'
      }
    })
    .after(cb)
    .expectStatus(200)
}

const getTimeline = (cb) => {
  return frisby.create('get list of user activities (timeline)')
    .get(`/users/${results.user.create.data.id}/timeline`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
        }
      ],
      info: {
      }
    })
}

const initiatePasswordReset = (cb) => {
  return frisby.create('initiate password reset')
    .post('/users/reset_password', {
      email: 'test@rechat.com'
    })
    .after(cb)
    .expectStatus(204)
}

const initiatePasswordResetEmailNotFound = (cb) => {
  return frisby.create('initiate password reset for a non-existing user')
    .post('/users/reset_password', {
      email: 'test@rechat.comcom'
    })
    .after(cb)
    .expectStatus(404)
}

const resetPasswordByTokenEmail = (cb) => {
  return frisby.create('reset password by token and email')
    .patch('/users/password', {
      email: 'test@rechat.com',
      token: 'a',
      password: '123456'
    })
    .after(cb)
    .expectStatus(200)
}

const resetPasswordByTokenEmailNoNewPassword = (cb) => {
  return frisby.create('reset password where no new password is specified')
    .patch('/users/password', {
      email: 'test@rechat.com',
      token: 'a',
    })
    .after(cb)
    .expectStatus(400)
}

const resetPasswordByTokenEmailInvalidEmail = (cb) => {
  return frisby.create('reset password by token for non-existing user')
    .patch('/users/password', {
      email: 'test@rechat.comcom',
      token: 'a',
      password: '123456'
    })
    .after(cb)
    .expectStatus(404)
}

const resetPasswordByTokenEmailInvalidToken = (cb) => {
  return frisby.create('reset password by token where token is invalid')
    .patch('/users/password', {
      email: 'test@rechat.com',
      token: 'b',
      password: '123456'
    })
    .after(cb)
    .expectStatus(403)
}

const resetPasswordByShadowTokenEmail = (cb) => {
  return frisby.create('reset password by shadow token and email')
    .patch('/users/password', {
      email: 'test@rechat.com',
      shadow_token: '206cc0a36c8ecfa37639a4d0dc682c73',
      password: '123456'
    })
    .after(cb)
    .expectStatus(200)
}

const resetPasswordByShadowTokenEmailInvalidEmail = (cb) => {
  return frisby.create('reset password by shadow token and email for non-existing user')
    .patch('/users/password', {
      email: 'test@rechat.comcom',
      shadow_token: '206cc0a36c8ecfa37639a4d0dc682c73',
      password: '123456'
    })
    .after(cb)
    .expectStatus(404)
}

const resetPasswordByShadowTokenEmailInvalidToken = (cb) => {
  return frisby.create('reset password by shadow token and email where token is invalid')
    .patch('/users/password', {
      email: 'test@rechat.com',
      shadow_token: 'bombastictoken',
      password: '123456'
    })
    .after(cb)
    .expectStatus(403)
}

const resetPasswordByShadowTokenPhone = (cb) => {
  return frisby.create('reset password by shadow token and phone number')
    .patch('/users/password', {
      phone_number: '+4368120265807',
      shadow_token: '206cc0a36c8ecfa37639a4d0dc682c73',
      password: '123456'
    })
    .after(cb)
    .expectStatus(200)
}

const resetPasswordByShadowTokenPhoneInvalidToken = (cb) => {
  return frisby.create('reset password by shadow token and phone number')
    .patch('/users/password', {
      phone_number: '+4368120265807',
      shadow_token: 'bombastictoken',
      password: '123456'
    })
    .after(cb)
    .expectStatus(403)
}

const resetPasswordByShadowTokenPhoneInvalidPhone = (cb) => {
  return frisby.create('reset password by shadow token and phone number for non-existing user')
    .patch('/users/password', {
      phone_number: '+4368120265817',
      shadow_token: '206cc0a36c8ecfa37639a4d0dc682c73',
      password: '123456'
    })
    .after(cb)
    .expectStatus(404)
}

const upgradeToAgentWithEmail = (cb) => {
  const agent = results.agent.getByMlsId.data[0]
  return frisby.create('upgrade user to agent with email')
    .post('/users/self/agents?associations[]=user.agents', {
      agent: agent.id,
      secret: agent.email,
    })
    .after(cb)
    .expectStatus(200)
}

const upgradeToAgentWithPhoneNumber = (cb) => {
  const agent = results.agent.getByMlsId.data[0]
  return frisby.create('upgrade user to agent with phone number')
    .post('/users/self/agents', {
      agent: agent.id,
      secret: agent.phone_number,
    })
    .after(cb)
    .expectStatus(200)
}

const upgradeToAgentInvalidSecret = (cb) => {
  const agent = results.agent.getByMlsId.data[0]
  return frisby.create('upgrade user to agent with invalid secret')
    .post('/users/self/agents', {
      agent: agent.id,
      secret: 'mr@bombastic.com',
    })
    .after(cb)
    .expectStatus(401)
}

const upgradeToAgentSecretMissing = (cb) => {
  const agent = results.agent.getByMlsId.data[0]
  return frisby.create('upgrade user to agent secret missing')
    .post('/users/self/agents', {
      agent: agent.id
    })
    .after(cb)
    .expectStatus(400)
}

const markAsNonShadow = (cb) => {
  return frisby.create('convert to non-shadow user')
    .put('/users/self', {
      is_shadow: true
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        id: results.authorize.token.data.id,
        type: 'user',
        is_shadow: true
      }
    })
}

const markAsShadow = (cb) => {
  return frisby.create('convert to shadow user')
    .put('/users/self', {
      is_shadow: false
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        id: results.authorize.token.data.id,
        type: 'user',
        is_shadow: false
      }
    })
}

const testShadowUserEmailReSignup = (cb) => {
  return frisby.create('testing signup for already existing shadow user')
    .post('/users', {
      client_id: config.tests.client_id,
      client_secret: config.tests.client_secret,
      first_name: '',
      last_name: '',
      password: '123456',
      email: 'test+email@rechat.com'
    })
    .after(cb)
    .expectStatus(202)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'user_reference',
        email: 'test+email@rechat.com',
        email_confirmed: false,
        phone_confirmed: false,
        is_shadow: true,
        fake_email: false
      }
    })
}

const resetPhoneShadowPasswordByEmail = (cb) => {
  return frisby.create('reset phone shadow user by email')
    .patch('/users/password', {
      email: 'guest+foobarbaz@rechat.com',
      shadow_token: 'c4ca4238a0b923820dcc509a6f75849b',
      password: '123456'
    })
    .after(cb)
    .expectStatus(406)
}

const resetPhoneShadowPassword = (cb) => {
  return frisby.create('reset phone shadow user by shadow token')
    .patch('/users/password', {
      phone_number: '+989028202677',
      shadow_token: 'c4ca4238a0b923820dcc509a6f75849b',
      password: '123456'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'user',
        phone_number: '+989028202677',
        fake_email: true,
        email_confirmed: false,
        phone_confirmed: true,
        is_shadow: true
      }
    })
}

const resetEmailShadowPassword = (cb) => {
  return frisby.create('reset email shadow user by shadow token')
    .patch('/users/password', {
      email: 'test+email@rechat.com',
      shadow_token: 'c4ca4238a0b923820dcc509a6f75849b',
      password: '123456'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'user',
        fake_email: false,
        email_confirmed: true,
        phone_confirmed: false,
        is_shadow: true
      }
    })
}

const deleteUser = (cb) => {
  return frisby.create('delete user')
    .delete('/users/self')
    .after(cb)
    .expectStatus(204)
}

function uploadEmailSignAttachments(cb) {
  const img = fs.createReadStream(path.resolve(__dirname, 'data/img/sample.jpg'))

  return frisby.create('upload email-signature pic')
    .post('/users/self/email_signature_attachments', {
      file: img
    },
    {
      json: false,
      form: true
    })
    .addHeader('content-type', 'multipart/form-data')
    .after((err, res, body) => {
      cb(err, {...res, body: JSON.parse(body)}, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: email_sign_img_response
    })
}

function patchUserCoverImage(cb) {
  const img = fs.createReadStream(path.resolve(__dirname, 'data/img/sample.jpg'))

  return frisby.create('patch user cover image')
    .patch('/users/self/cover_image_url', {
      file: img
    },
    {
      json: false,
      form: true
    })
    .addHeader('content-type', 'multipart/form-data')
    .after((err, res, body) => {
      cb(err, {...res, body: JSON.parse(body)}, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: user_cover_img_response
    })
}

function patchUserProfileImage(cb) {
  const img = fs.createReadStream(path.resolve(__dirname, 'data/img/sample.jpg'))

  return frisby.create('patch user profile image')
    .patch('/users/self/profile_image_url', {
      file: img
    },
    {
      json: false,
      form: true
    })
    .addHeader('content-type', 'multipart/form-data')
    .after((err, res, body) => {
      cb(err, {...res, body: JSON.parse(body)}, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: user_cover_img_response
    })
}

function getUserBrands(cb) {
  return frisby.create('get user brands')
    .get('/users/self/brands?associations=brand.children')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [
        {
          name: 'Manhattan',
          brand_type: 'Region',
          member_count: 1,
          children: [
            {
              name: '140 Franklin',
              brand_type: 'Office',
              member_count: 1,
              children: [{
                name: 'John Doe\'s Team',
                brand_type: 'Team',
                member_count: 1,
                children: null
              }],
            }
          ],
        },
        {
          name: 'Brooklyn',
          brand_type: 'Region',
          member_count: 1,
          children: null,
        }
      ]
    })
}

const settings = {
  keys: {
    BOOL: 'import_tooltip_visited',
    // Something that includes dash and/or double underscores:
    INT: 'onboarding__marketing-center',
    STR1: 'grid_deals_agent_network_sort_field',
    STR2: 'grid_deals_sort_field',
    ARRAY: 'user_filter',
    JSON: 'deals_grid_filter_settings',
  },

  put (key, value, name = '') {
    if (!name) {
      name = `${value === null ? 'nullify' : 'put'} setting ${key}`
    }
    
    return cb => frisby
      .create(name)
      .put(`/users/self/settings/${key}`, { value })
      .after(cb)
      .expectStatus(200)
  },

  putInvalid (key, value, name, message = String) {
    return cb => frisby
      .create(name)
      .put(`/users/self/settings/${key}`, { value })
      .after(cb)
      .expectStatus(400)
      .expectJSON({ message })
  },

  check (settings, name = 'check user settings') {
    return cb => frisby
      .create(name)
      .get('/users/self/roles')
      .after(cb)
      .expectStatus(200)
      .expectJSON('data.?', { settings })
  },
}

function getActiveBrandRole(expected) {
  return (cb) => frisby
    .create('get active brand role')
    .get('/users/self/active-role')
    .after(cb)
    .expectStatus(200)
    .expectJSON('data', expected)
}

function changeActiveBrand(cb) {
  return frisby.create('change active brand')
    .patch('/users/self/active-brand')
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  lookupExpect404,
  create,
  create401,
  getUser,
  getUserRoles,
  getUser404,
  lookupExpectPassword,
  update,
  updateEmailSignPic,
  changePassword,
  changePassword401,
  resetPassword,
  resetPassword404,
  patchUserTimeZone,
  addInvalidActivityByAction,
  addInvalidActivityByType,
  addInvalidActivityActionMissing,
  addInvalidActivityObjectClassMissing,
  addInvalidActivityObjectMissing,
  addActivity,
  getTimeline,
  initiatePasswordResetEmailNotFound,
  initiatePasswordReset,
  resetPasswordByTokenEmailNoNewPassword,
  resetPasswordByTokenEmailInvalidEmail,
  resetPasswordByTokenEmailInvalidToken,
  resetPasswordByTokenEmail,
  resetPasswordByShadowTokenEmailInvalidEmail,
  resetPasswordByShadowTokenEmailInvalidToken,
  resetPasswordByShadowTokenEmail,
  resetPasswordByShadowTokenPhoneInvalidPhone,
  resetPasswordByShadowTokenPhoneInvalidToken,
  resetPasswordByShadowTokenPhone,
  upgradeToAgentInvalidSecret,
  upgradeToAgentSecretMissing,
  upgradeToAgentWithEmail,
  upgradeToAgentWithPhoneNumber,
  markAsShadow,
  markAsNonShadow,
  testShadowUserEmailReSignup,
  resetPhoneShadowPasswordByEmail,
  resetPhoneShadowPassword,
  resetEmailShadowPassword,
  uploadEmailSignAttachments,
  patchUserCoverImage,
  patchUserProfileImage,

  brands: createBrands('create brands', brandSetup, (response) => response.data[0].id),
  getUserBrands,
  
  putBoolSetting: settings.put(settings.keys.BOOL, true),
  putIntSetting: settings.put(settings.keys.INT, 1),
  putFirstStrSetting: settings.put(settings.keys.STR1, 'foo'),
  putArraySetting: settings.put(settings.keys.ARRAY, ['one', 2, true]),
  putJsonSetting: settings.put(settings.keys.JSON, { foo: 'bar', baz: [0] }),
  
  putSecondStrSetting: settings.put(settings.keys.STR2, 'bar'),
  nullifySecondStringSetting: settings.put(settings.keys.STR2, null),

  /* FIXME: Somehow enable these test-cases as well. ATM, enabling them will
   * lead to false failure on next test-cases: */
  //putInvalidSettingKey: settings.putInvalid(
  //  'some_invalid_key', 1.234, 'put value for an invalid setting key'
  //),
  //putInvalidSettingValue: settings.putInvalid(
  //  settings.keys.INT, 'foo', 'put invalid value for a valid setting key'
  //),

  checkSettings: settings.check({
    [settings.keys.BOOL]: true,
    [settings.keys.INT]: 1,
    [settings.keys.STR1]: 'foo',
    [settings.keys.ARRAY]: ['one', 2, true],
    [settings.keys.JSON]: { foo: 'bar', baz: [0] },

    [settings.keys.STR2]: null,
  }),

  getActiveBrandRoleAsOwnBrand: getActiveBrandRole({
    brand: {
      name: 'Manhattan',
      type: 'brand'
    },
    acl: ['Admin'],
    settings: {
      type: 'user_setting'
    },
    subscription: null,
    type: 'user_role',
  }),

  ...switchBrand(() => results.user.brands.data[0].children[0].children[0].id, {
    putSettingInAnotherBrand: settings.put(settings.keys.BOOL, true),
    getActiveBrandRoleAsAgentBrand: getActiveBrandRole({
      brand: {
        name: 'John Doe\'s Team',
        type: 'brand'
      },
      acl: ['Deals'],
      settings: {
        type: 'user_setting'
      },
      subscription: null,
      type: 'user_role',
    }),
  }),

  ...switchBrand(() => results.user.brands.data[0].children[0].id, {
    changeActiveBrand,
    getActiveBrandRoleAfterChange: getActiveBrandRole({
      brand: {
        name: '140 Franklin',
        type: 'brand'
      },
      acl: ['Admin'],
    }),
  }),

  deleteUser
}
