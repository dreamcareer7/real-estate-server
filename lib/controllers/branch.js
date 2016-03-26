var validator = require('../utils/validator.js');

var branch_request = {
  type: 'object',
  required: true
};

function createBranchURL(req, res) {
  validator(branch_request, req.body, err => {
    if(err)
      return res.error(err);

    Branch.createURL(req.body, (err, data) => {
      if(err)
        return res.error(err);

      return res.json(data);
    });
  });
}

function getBranchURL(req, res) {
  if(!req.query)
    return res.error(Error.Validation('You must supply a url paramter'));

  Branch.getURL(req.query.url, (err, data) => {
    if(err)
      return res.error(err);

    return res.json(data);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/branch', b(createBranchURL));
  app.get('/branch', b(getBranchURL));
};

module.exports = router;
