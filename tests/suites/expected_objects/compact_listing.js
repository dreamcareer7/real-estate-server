var v = require('../../../lib/utils/response_validation.js');

module.exports = {
    "type": "compact_listing",
    "id": String,
    "created_at": Number,
    "updated_at": Number,
    "deleted_at": v.optionalNumber,
    "price": Number,
    "status": String,
    "mls_number": String,
    "location": {
        "latitude": Number,
        "longitude": Number,
        "type": "location"
    },
    "favorited": Boolean,
    "list_agent": v.optionalString
};