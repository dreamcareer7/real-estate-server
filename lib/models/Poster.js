var mustache = require('mu2');
var uuid = require('node-uuid');
var path = require('path');
var async = require('async');
var request = require('request');
var config = require('../config.js');
var url2png = require('url2png')(config.url2png.api_key, config.url2png.private_key);

Poster = {}

Poster.html = function(name, params, cb) {
  var m = mustache.compileAndRender(__dirname + '/../html/poster/' + path.basename(name) + '.html', params);
  var html = '';
  m.on('data', (rendered) => {
    html += rendered.toString();
  });

  m.on('end', () => {
    cb(null, html);
  });
  
  m.on('error', cb);
}

Poster.image = function(name, params, cb) {
  var html = cb => Poster.html(name, params, cb);

  var upload = (cb, results) => {    
    var id = uuid.v1();

    var file = {
      name: id,
      ext: '.html',
      body: results.html,
      info: {
        mime: 'text/html',
        'mime-extension': 'html'
      }
    };

    S3.upload('posters', file, (err, upload) => {
      if(err)
        return cb(err);

      cb(null, upload.url);
    });
  }

  var image = (cb, results) => {
    var options = {
      viewport : '1024x682',
      protocol: 'http'
    }
    
    //Get the URL 
    var url = url2png.buildURL(results.upload, options);
    request(url, err => {
      if(err)
        return cb(Error.Generic(err));
      
      cb(null, url);
    });
  }
  
  async.auto({
    html:    html,
    upload : ['html', upload],
    image :  ['upload', image]
  }, (err, results) => {
    if(err)
      return cb(err);
    
    cb(null, results.image);
  });
}

