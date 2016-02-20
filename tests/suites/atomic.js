var asyncFail = (cb) => {
  return frisby.create('Trigget two async errors. Server should rollback and not crash.')
    .get('/admin/async_fail')
    .after(cb)
    .expectStatus(500)
}


module.exports = {
  asyncFail
}