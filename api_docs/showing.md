# Group Showings Seller-side

## Overview
A Showing is an event that a seller agent makes on Rechat and usually a buyer
agent can book from available times.

### Create a showing [POST /showings]
<!-- include(tests/showing/create.md) -->

### Get all showings [POST /showings/filter]
<!-- include(tests/showing/filter.md) -->

### Get a single showings [GET /showings/:id]
<!-- include(tests/showing/getShowing.md) -->

### Filter by status [POST /showings/filter]
<!-- include(tests/showing/filterByStatus.md) -->

### Get a showing [GET /showings/:id]
<!-- include(tests/showing/create.md) -->

### View upcoming showing appointments [GET /calendar]
<!-- include(tests/showing/upcomingAppointments.md) -->

### Cancel a showing appointment (on seller side) [POST /showings/:id/appointments/:appointment]
<!-- include(tests/showing/sellerAgentCancelAppointment.md) -->

# Group Showings Buyer-side

## Overview
APIs used for the buyer experience.

### Get a showing's public data [GET /showings/public/:token]
<!-- include(tests/showing/getShowingPublic.md) -->

### Request a showing appointment [POST /showings/public/:token/appointments]
<!-- include(tests/showing/requestAppointment.md) -->

### Cancel a showing appointment (on buyer side) [POST /showings/public/appointments/:token/cancel]
<!-- include(tests/showing/buyerAgentCancelAppointment.md) -->

