# Group Showings

## Overview
A Showing is an event that a seller agent makes on Rechat and usually a buyer
agent can book from available times.

### Create a showing [POST /showings]
<!-- include(tests/showing/create.md) -->

### Get all showings [POST /showings/filter]
<!-- include(tests/showing/filter.md) -->

### Filter by status [POST /showings/filter]
<!-- include(tests/showing/filterByStatus.md) -->

### Get a showing [GET /showings/:id]
<!-- include(tests/showing/create.md) -->

### Request a showing appointment [POST /showings/:id/appointments]
<!-- include(tests/showing/requestAppointment.md) -->

### View upcoming showing appointments [GET /calendar]
<!-- include(tests/showing/upcomingAppointments.md) -->

### Cancel a showing appointment (on buyer side) [POST /showings/appointments/:token/cancel]
<!-- include(tests/showing/cancelAppointment.md) -->

### Cancel a showing appointment (on seller side) [DELETE /showings/:id/appointments/:appointment]
<!-- include(tests/showing/sellerAgentCancelAppointment.md) -->

