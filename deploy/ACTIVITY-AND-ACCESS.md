# Portal access, activity logs and caution defaults

Hotel receptionists now see Finance (Expenses and Damages), Pricing Config,
Promotions and Staff in the existing sidebar, alongside CEO and hotel manager.
These modules retain their existing controls and API behavior.

CEO and hotel manager can open `/portal/activity-logs`. Receptionists and other
roles are denied by the server. Logs begin after deployment; historical activity
cannot be reconstructed. The paginated page shows staff, time, request outcome,
record/model and changed field names. Ordinary page requests, failed requests and
ORM create/update/delete actions are recorded. Bulk changes include a target ID
where one was supplied. Query strings, cookies, form bodies and field values are
not recorded. Background writes are labelled System / anonymous. Direct changes
made outside the app, such as manual database SQL, are not observable here.

Request logs are written after the response; a logging failure is reported to the
server log. ORM change records use the operation's transaction when provided.
This is an operational activity trail, not tamper-proof external storage.

Caution Fees has a **Default caution fee** form available to CEO, hotel manager and
receptionist. This suggests the amount in the separate manual fee collection form. Booking
creation does not create or prefill caution fees. Changing the default does not rewrite old deposits or
refunds. An empty/unconfigured setting defaults to zero. Zero overrides remain
possible when no deposit was received.

Restart Node after deploying. Activity log and hotel setting tables are created
by the awaited startup schema step before requests are accepted. Database
CREATE/ALTER permissions are required. No manual SQL is necessary.
