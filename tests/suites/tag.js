var getAll = (cb) => {
  return frisby.create('get all tags')
    .get('/tags')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data:[
        {
          type: 'tag'
        }
      ]
    })
}

module.exports = {
  getAll
};