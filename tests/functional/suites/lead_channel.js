const { createBrands, switchBrand } = require('../util')
const config = require('../../../lib/config')
const brandSetup = require('./data/lead_channel/brand')
const F = frisby.create.bind(frisby)
const R = () => results.lead_channel
const theBrand = () => R().brands.data[0].id

function createLeadChannel(cb) {
  const data = {
    sourceType: 'Zillow',
  }

  return F('Should create a lead channel')
    .post(`/brands/${theBrand()}/leads/channels`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        source_type: data.sourceType,
      },
    })
}

function getUserLeads(cb) {
  return F('get user lead channels')
    .get(`/brands/${theBrand()}/leads/channels`)
    .after((err, res, body) => {
      if (!body.data || !body.data.length) {
        throw new Error('lead channels is empty')
      }
      const row = body.data[0]
      if (row.id !== R().createLeadChannel.data.id) {
        throw new Error('invalid leadChannel data')
      }

      cb(err, res, body)
    })
    .expectStatus(200)
}

function updateLeadChannel(cb) {
  const leadChannelId = R().createLeadChannel.data.id
  const newBrandId = R().brands.data[1].id

  const data = {
    brand: newBrandId,
  }

  return F('Should update the lead channel')
    .put(`/brands/${theBrand()}/leads/channels/${leadChannelId}`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        brand: newBrandId,
      },
    })
}

function deleteLeadChannel(cb) {
  const leadChannelId = R().createLeadChannel.data.id
  const newBrandId = R().brands.data[1].id

  const data = {
    brand: newBrandId,
  }

  return F('Should delete the lead channel')
    .delete(`/brands/${theBrand()}/leads/channels/${leadChannelId}`, data)
    .after(cb)
    .expectStatus(204)
}

function zillowUnAuthorized(cb) {
  const data = {}

  return F('Should get unAuhthorized status')
    .post('/leads/channels/zillow', data)
    .after(cb)
    .expectStatus(401)
}

function zillowSuccess(cb) {
  const data = {}

  return F('Should get success if basic auth is provided')
    .post('/leads/channels/zillow', data)
    .addHeader('Authorization', `Basic ${new Buffer(config.zillow_sns.user + ':' + config.zillow_sns.pass).toString('base64')}`)
    .after(cb)
    .expectStatus(200)
}

function zillowFailed(cb) {
  const data = {}

  return F('Should get success if basic auth is provided')
    .post('/leads/channels/zillow', data)
    .addHeader('Authorization', `Basic ${new Buffer('invalid:invalid').toString('base64')}`)
    .after(cb)
    .expectStatus(401)
}


module.exports = {
  brands: createBrands('create brands', brandSetup, (response) => response.data[0].id),
  ...switchBrand(theBrand, {
    createLeadChannel,
    getUserLeads,
    updateLeadChannel,
    deleteLeadChannel,
    zillowUnAuthorized,
    zillowSuccess,
    zillowFailed
  }),
}
