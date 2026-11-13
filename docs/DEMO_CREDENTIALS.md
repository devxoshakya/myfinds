# Demo credentials

Shared internally only — **do not commit real production credentials here.**

## Station staff

| | |
| --- | --- |
| Email | `staff@myfinds.pro` |
| Password | `staff123` |
| Role | `STATION_STAFF` |
| Stations | Rajiv Chowk Metro, Central Secretariat Metro |
| Can do | Confirm receipt (`POST /api/staff/reports/:id/confirm-receipt`) for reports whose custody station is one of the two above |

## Admin

| | |
| --- | --- |
| Email | `admin@myfinds.pro` |
| Password | `admin123` |
| Role | `ADMIN` |
| Can do | Confirm receipt at **any** station |

Both sign in through the web app's login page (Better Auth email + password).
Recreated via:

```sh
cd apps/server
bun run staff:create --email staff@myfinds.pro --password "staff123" \
  --name "Debug Kumar" --role STATION_STAFF \
  --station "Rajiv Chowk Metro" --station "Central Secretariat Metro"
bun run staff:create --email admin@myfinds.pro --password "admin123" \
  --name "Test Admin" --role ADMIN
```

> These passwords are weak by design for the demo. Rotate before any real
> launch (`bun run staff:create` with an existing email keeps the password —
> change it through the app or delete + recreate the user).
