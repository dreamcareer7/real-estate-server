const review_response = require('./expected_objects/review.js')

registerSuite('envelope', ['authenticate', 'saveToken', 'create'])


const create = cb => {
  const review = {
    envelope_document: results.envelope.create.data.documents[0].id,
    state: 'Pending',
    comment: 'This review has been submitted automatically as a test'
  }

  return frisby.create('create a review')
    .post(`/deals/${results.deal.create.data.id}/reviews`, review)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: review
    })
    .expectJSON({
      code: String,
      data: review_response
    })
}

const bulk = cb => {
  const review = {
    envelope_document: results.envelope.create.data.documents[0].id,
    state: 'Pending',
    comment: 'This review has been submitted automatically as a test'
  }

  const body = {
    reviews: [review,review,review]
  }

  return frisby.create('create a bunch of reviews')
    .post(`/deals/${results.deal.create.data.id}/reviews/bulk`, body)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        review,
        review,
        review
      ]
    })
    .expectJSON({
      code: String,
      data: [
        review_response,
        review_response,
        review_response
      ],
      info: {
        count: 3
      }
    })
}

const update = cb => {
  const body = {
    state: 'Rejected',
    comment: 'Automatically rejected as a test'
  }

  return frisby.create('update a review')
    .put(`/reviews/${results.review.create.data.id}`, body)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: body
    })
    .expectJSON({
      code: String,
      data: review_response
    })
}

const getDeal = cb => {
  return frisby.create('make sure reviews have been submitted')
    .get(`/deals/${results.deal.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSON({
      code: String,
      data: {
        reviews: [review_response,review_response,review_response,review_response]
      }
    })
    .expectJSONLength({
      data: {
        reviews: 4
      }
    })
}

module.exports = {
  create,
  bulk,
  update,
  getDeal
}
