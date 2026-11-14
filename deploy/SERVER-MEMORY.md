# Diagnose server memory errors

Run on the Linux VPS from the application directory:

```sh
sudo bash scripts/server-memory-report.sh
```

The report reads RAM, swap, disk and inode usage, `/dev/shm`, process names/RSS, recent kernel OOM messages and (when locally accessible) PostgreSQL settings and lock usage. It does not load application models, source `.env`, print process arguments, or change records/settings. PostgreSQL diagnostics target the default local instance, which may differ from an app configured for a remote/container database.

Provide the exact original error and its HINT, plus this report. An `out of shared memory` error with a `max_locks_per_transaction` hint refers to PostgreSQL lock-table capacity. `could not resize shared memory segment ... No space left on device` needs shared-memory filesystem/container limits checked. Kernel OOM kills or JavaScript heap errors require RAM/process/heap investigation instead. These are different failures; do not blindly raise every limit or add swap as a universal fix.

The application currently has model-level `sync({alter:true})` calls. Repeated schema alterations and numerous database objects can increase startup lock demand; confirm the error and inspect schema/index counts before replacing this with controlled migrations. Keep automatic creation of required new tables/fields in the awaited startup migration path. Do not delete database indexes or disable schema setup blindly.

Once identified, establish a RAM budget across PostgreSQL, Node workers and other services; size connection pools across all app workers; paginate large reads and exports; stream uploads; monitor RSS, disk, `/dev/shm` and database connections; configure alerts and a supervised restart policy. Back up configuration and plan any database restart. A Node heap limit does not cap total process memory, and automatic restarts are recovery rather than a cure. Exact budgets depend on the VPS size and workload.

References:
- https://www.postgresql.org/docs/current/runtime-config-locks.html
- https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes
