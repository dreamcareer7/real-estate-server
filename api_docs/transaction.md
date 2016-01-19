# Group Transaction

Possible values for `transaction_status` are `Buyer`,`Seller`,`Buyer/Seller`,`Lease`}

## Get User's Transaction [GET /transactions]
<!-- include(tests/transaction/getUserTransaction.md) -->

## Create Transaction [POST /transactions]
<!-- include(tests/transaction/create.md) -->

## Update Transaction [PUT /transactions/{id}]
<!-- include(tests/transaction/patchTransaction.md) -->

## Delete Transaction [DELETE /transactions/{id}]
<!-- include(tests/transaction/remove.md) -->

## Get Transaction [GET /transactions/{id}]
<!-- include(tests/transaction/getTransaction.md) -->

## Assign Contact [POST /transactions/{id}/contacts]
<!-- include(tests/transaction/assign.md) -->

## Widthdraw Contact [DELETE /transactions/{id}/contacts/{rid}]
<!-- include(tests/transaction/assign.md) -->

## Add Role [POST /transactions/{id}/contacts/{cid}/roles]
<!-- include(tests/transaction/addRole.md) -->

## Remove Role [DELETE /transactions/{id}/contacts/{cid}/roles/{role}]
<!-- include(tests/transaction/removeRole.md) -->

module.exports = {
  patchTransaction,
  remove,
}