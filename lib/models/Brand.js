var url                  = require('url');
var db                   = require('../utils/db.js');
var validator            = require('../utils/validator.js');
var config               = require('../config.js');

var sql_get              = require('../sql/brand/get.sql');
var sql_get_by_hostname  = require('../sql/brand/get_hostname.sql');

Brand = {};
Orm.register('brand', Brand);

Brand.get = function(id, cb) {
  var user = process.domain.user ? process.domain.user.id : null

  db.query(sql_get, [id, user], (err, res) => {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Brand ' + id + ' not found'));

    var brand = res.rows[0];
  
    organizeRoles(brand);
    
    const hostname = (brand.hostnames && brand.hostnames.length) ? brand.hostnames[0] : config.webapp.hostname;
    
    brand.base_url = url.format({
      protocol: config.webapp.protocol,
      hostname: hostname,
    })

    cb(null, brand);
  });
}

function organizeRoles(brand) {
  if(!brand.roles)
    return ;

  var roles = JSON.parse(JSON.stringify(brand.roles));

  roles.forEach( r => {
    if (!brand.roles[r.role])
      brand.roles[r.role] = [];
  
    brand.roles[r.role].push(r.user);
  });
}

Brand.getByHostname = function(hostname, cb) {
  db.query(sql_get_by_hostname, [hostname], (err, res) => {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Brand ' + hostname + ' not found'));


    return Brand.get(res.rows[0].brand, cb);
  });
};

Brand.proposeUserForListingInquiry = function(brand_id, listing_id, cb) {
  Brand.getDefaultUser(brand_id, cb);
}

Brand.proposeContactingUser = function(brand_id, cb) {
  Brand.getDefaultUser(brand_id, cb);
}

Brand.getDefaultUser = function(brand_id, cb) {
  Brand.get(brand_id, (err, brand) => {
    if(err)
      return cb(err);
    
    if(brand.roles && brand.roles.Default)
      return User.get(brand.roles.Default[0], cb);

    if(brand.users)
      return User.get(brand.users[0], cb);
      
    cb();
  });
}

Brand.getCurrentId = () => {
  var brand;
  
  if(process.domain && process.domain.req)
    brand = process.domain.req.headers['x-rechat-brand'];
  
  if(!brand && process.domain.user)
    brand = process.domain.user.brand;
  
  return brand;
}

Brand.getCurrent = cb => {
  var id = Brand.getCurrentId();
  
  if(!id)
    return cb();

  Brand.get(id, cb)
}

Brand.publicize = function(model) {
  if(model.palette)
    model.palette.type = 'brand_palette';

  if(model.assets)
    model.assets.type = 'brand_assets';

  if(model.messages)
    model.messages.type = 'brand_messages';
}

Brand.associations = {
  users: {
    collection: true,
    model: 'User'
  },
  
  agents: {
    collection: true,
    model: 'Agent'
  },
  
  offices: {
    collection: true,
    model: 'Office'
  },

  parent: {
    optional:true,
    model: 'Brand'
  }
}

module.exports = function(){};
