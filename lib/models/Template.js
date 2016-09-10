var mustache = require('mu2');

Template = {}

Template.render = function(name, params, cb) {
  var m = mustache.compileAndRender(name, params);
  var html = '';
  m.on('data', (rendered) => {
    html += rendered.toString();
  });

  m.on('end', () => {
    cb(null, html);
  });

  m.on('error', cb);
}