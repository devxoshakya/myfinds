# Delhi NCR transport catalog

The checked-in baseline is maintained in
[`packages/shared/src/transport-catalog.ts`](../packages/shared/src/transport-catalog.ts).
It covers the selected DMRC, Indian Railways, DTC, and ISBT places without a
runtime dependency on an external transport API.

To refresh it, review the operators' current public station directories,
update the catalog entries and source labels, then run:

```bash
bun run check-types
bun run db:seed
```

The seed is idempotent and creates the required states, cities, and active
stations. Matching uses the persisted station and city IDs, so catalog changes
do not require a separate matching-data migration.
