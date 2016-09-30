const mustache = require('mu2')

Template = {}

Template.render = function (name, params, cb) {
  const m = mustache.compileAndRender(name, params)
  let html = ''
  m.on('data', (rendered) => {
    html += rendered.toString()
  })

  m.on('end', () => {
    cb(null, html)
  })

  m.on('error', cb)
}
