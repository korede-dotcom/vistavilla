# Reset operational records while preserving accounts

`scripts/reset-records.js` uses the database configured by `.env`. It does not
import application models or run model synchronization. PostgreSQL only.

Preview (no changes):

```sh
node scripts/reset-records.js
```

Execute the previewed scope:

```sh
node scripts/reset-records.js --execute
```

Execution requires `pg_dump` on PATH and first creates a full custom-format
backup in ignored `.backups/` with private file permissions. If backup fails, no
records are cleared. The script truncates all other base tables in the configured
application schema, keeping `users` and `staffs` (or `staff`) unchanged. Table
structures remain; only cleared-table identities are reset. It uses no CASCADE.
Foreign-key conflicts cause failure and rollback instead of deleting protected
accounts or records in other schemas.

Users/staff contents are fingerprinted before/after within the transaction and
all cleared tables are verified empty before commit. Stop the application while
running against a deployment to avoid new requests creating records after the
reset. Point `.env` at the intended database; running locally does not inherently
reset a VPS database with different credentials.

Existing app startup seeds payment modes again on restart; new operational or
activity records may also be created by subsequent app use. Uploaded Cloudinary
files are not deleted by a database reset.
