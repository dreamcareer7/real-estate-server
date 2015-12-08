var config = require('../config.js');

function uploadMedia(req, res) {
  var user = req.params.id;

  S3.parseSingleFormData(req, function(err, media) {
    if(err)
      return res.error(err);

    S3.upload(config.buckets.avatars, media, function(err, url) {
      if (err)
        return res.error(err);

      if (!url) {
        res.status(404);
        return res.end();
      }

      res.status(200);
      res.model({
        type: 'url',
        url: url
      });
    });
  });
}

function uploadMediaFake(req, res) {
  var user = req.params.id;

  console.time("upload");
  S3.parseSingleFormData(req, function(err, media) {
    if(err)
      return res.error(err);

    res.status(200);
    res.model({
      type: 'url',
      url: 'http://foobar.org'
    });
    console.timeEnd("upload");
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/media', b(uploadMedia));
  app.post('/fake', uploadMediaFake);
};

module.exports = router;
