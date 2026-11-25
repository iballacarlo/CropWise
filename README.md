# CropWise Backend

CropWise: Crop Production and Farm Inventory Management System is a college project using a NestJS REST API. The planned system covers crops, farm activities, harvests, inventory and inventory transactions.

Current status: **Phase 5 user and crop CRUD implemented.** User management is Admin-only; crop records are scoped to their authenticated owner, with Admin access across owners.

## Local setup

Use Node.js and npm. This project was previously checked with Node 24.13.1 and npm 11.8.0. Some Nest CLI dependencies declare a newer minimum in the Node 24 line (24.15.0); use a compatible Node version when setting up another machine.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Start MySQL in XAMPP, then edit `.env` and set your own `DB_USERNAME` and `DB_PASSWORD`. Copy `.env.example` only if `.env` does not already exist. An empty password is accepted only when that is actually how your local MySQL account is configured. Keep credentials in `.env`; Git ignores it and allows the credential-free `.env.example`.

Set `JWT_SECRET` to a private random value of at least 32 bytes. Generate one with the command shown beside the variable in `.env.example`; never commit or share `.env`. The local setup generated a private secret because this repository's existing `.env` had an empty `JWT_SECRET`.

```powershell
npm.cmd run db:create
npm.cmd run db:check
npm.cmd run db:migration:run
npm.cmd run start:dev
```

`npm run db:create` issues only `CREATE DATABASE IF NOT EXISTS cropwise_db` with `utf8mb4`; it does not modify other databases. `npm run db:check` performs a read-only `SELECT 1` and confirms the selected database. `DB_DATABASE` is restricted to `cropwise_db` so the application cannot accidentally target another database.

The existing starter endpoint is:

```http
GET http://localhost:3000/api/v1
```

It returns `Hello World!`. Starting the application also requires a successful TypeORM connection to `cropwise_db`.

## Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Create a standard user account |
| `POST` | `/api/v1/auth/login` | Verify credentials and return a bearer access token |
| `GET` | `/api/v1/auth/profile` | Return the signed-in user's safe profile |

Registration accepts `fullName`, `email` and `password`. Passwords need at least 8 characters and may not exceed 72 UTF-8 bytes. Email is trimmed and lowercased; duplicate addresses return `409`. Public registration always creates the `User` role. Responses never include password hashes. Login returns a JWT with the configured expiration (default one hour); send it on protected requests as `Authorization: Bearer <token>`. Invalid credentials and invalid or expired tokens return `401`.

JWT logout is client-side: discard the token. This phase does not keep sessions, revoke individual tokens or issue refresh tokens, so a token remains usable until it expires. Keep token lifetimes short and protect tokens as credentials.

For the first administrator, set `INITIAL_ADMIN_FULL_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` in your private `.env`, then run `npm.cmd run seed:admin`. This creates an Admin only if that email is unused; it never promotes or changes an existing account. Clear those optional seed values after setup.

## User and crop endpoints

All `/users` routes require a JWT for an Admin. These routes can create, list, view, update a user's name, email or role, and delete another user. Admin-created passwords are hashed; user responses never include password data. An Admin cannot change their own role or delete their own account, and deleting a user with related records returns `409 Conflict`.

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/v1/users` | Admin |
| `GET` | `/api/v1/users` | Admin |
| `GET` | `/api/v1/users/:id` | Admin |
| `PATCH` | `/api/v1/users/:id` | Admin |
| `DELETE` | `/api/v1/users/:id` | Admin |
| `POST` | `/api/v1/crops` | Any signed-in user |
| `GET` | `/api/v1/crops` | Own crops; Admin sees all |
| `GET` | `/api/v1/crops/:id` | Owner or Admin |
| `PATCH` | `/api/v1/crops/:id` | Owner or Admin |
| `DELETE` | `/api/v1/crops/:id` | Owner or Admin |

Crop fields are `cropName`, `cropType`, `plantingDate`, optional `expectedHarvestDate`, and optional `cropStatus`. The API derives crop ownership from the JWT; `userId` in a request is rejected. Expected harvest date cannot be earlier than planting date. A crop with related activities or harvests cannot be deleted and returns `409 Conflict`. Missing or out-of-scope crops return `404`.

## Configuration

| Variable       | Behavior                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| `NODE_ENV`     | `development`, `test`, or `production`; defaults to `development`            |
| `PORT`         | Integer from 1 to 65535; defaults to `3000`                                  |
| `CORS_ORIGINS` | Comma-separated exact HTTP(S) origins; empty disables browser CORS           |
| `DB_HOST`      | Required outside tests; commonly `127.0.0.1` for XAMPP                       |
| `DB_PORT`      | Required MySQL port from 1 to 65535; commonly `3306`                         |
| `DB_USERNAME`  | Required; use the account configured in your local MySQL                     |
| `DB_PASSWORD`  | Must be present; may be empty only for an intentionally blank MySQL password |
| `DB_DATABASE`  | Must be `cropwise_db`                                                        |
| `JWT_SECRET`   | Required outside tests; private signing secret of at least 32 bytes          |
| `JWT_EXPIRES_IN` | Token lifetime in seconds, minutes, hours or days; defaults to `1h`        |
| `INITIAL_ADMIN_*` | Optional one-time first administrator seed values                          |

For a future browser client, set an exact origin such as `CORS_ORIGINS=http://localhost:5173`. Paths and wildcards are rejected. Blank origins grant no cross-origin browser access. Postman and server-to-server calls do not require CORS permission. CORS is a browser policy, not authentication.

Global validation transforms declared DTO input, rejects unknown fields and invalid values. Future request DTOs must use validation decorators to receive these checks. Validation responses omit the submitted target and value. Nest's built-in exception handler handles HTTP errors and returns a generic message for unexpected failures; diagnostic details are not included in the response.

Observe integration is disabled in `app.module.ts` and `main.ts` because it contained placeholder monitoring credentials. Its package remains installed; no existing source files were deleted.

## Structure

```text
src/
  common/configure-app.ts       Shared API prefix, validation and CORS setup
  config/environment.ts         Environment parsing and startup validation
  config/environment.spec.ts    Configuration tests
  database/
    data-source.ts              TypeORM CLI data source and migration discovery
    database-options.ts         Shared MySQL connection, entities and migrations
    migrations/                 Versioned schema changes
  auth/                         Registration, login, JWT strategy, guard and profile
  users/                        Admin user CRUD and role-based access
  crops/                        Crop CRUD with per-owner access checks
  scripts/seed-admin.ts         Optional one-time initial administrator command
  users/entities/               User entity and role enum
  crops/entities/               Crop entity and status enum
  farm-activities/entities/     Farm activity entity
  inventory/entities/           Inventory entity
  inventory-transactions/entities/ Inventory transaction entity and enum
  harvests/entities/            Harvest entity
  app.module.ts                 Application module, global config and TypeORM
  app.controller.ts             Existing starter endpoint
  app.service.ts                Existing starter service
  main.ts                       Server bootstrap and shutdown hooks
scripts/
  create-database.cjs           Creates only the cropwise_db database
  check-database.cjs             Read-only MySQL connection check
test/
  app.e2e-spec.ts                HTTP configuration tests
  jest-e2e.json                  HTTP test runner configuration
.env.example                    Non-secret environment template
```

All six required entities are implemented in their domain folders. Authentication and the Phase 5 user and crop CRUD modules are implemented. Farm activity, harvest, and inventory modules remain for later phases.

## Database commands

```powershell
npm.cmd run db:create
npm.cmd run db:check
npm.cmd run db:migration:generate -- src/database/migrations/InitialSchema
npm.cmd run db:migration:run
npm.cmd run db:migration:revert
npm.cmd run db:migration:run:prod
```

TypeORM uses `synchronize: false` and does not automatically run migrations on startup. The initial migration creates all six tables. Run it only after `db:check` succeeds. Reverting this migration drops those six tables and their data.

## Checks

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
npm.cmd run db:check
```

The database tests use test-only environment defaults and skip connecting to MySQL. `npm run db:check` requires your local `.env` and a running MySQL server. Jest uses Node's experimental VM modules to support the installed NestJS 12 ESM packages; its experimental warning is expected.

Phase 1 validation recorded 14 unit tests and 10 HTTP tests passing, along with build, lint, TypeScript and a local HTTP smoke check. Phase 2 validation passed build, lint, TypeScript checking, 18 unit tests, 10 HTTP tests, script syntax checks, and loading the compiled TypeORM data source configuration without connecting. Phase 3 validation passed build, lint, TypeScript checking, 24 unit tests and 10 HTTP tests. The migration was applied locally and verified to create six required tables and five foreign keys; the Nest dev server connected and `GET /api/v1` returned HTTP 200. Phase 4 authentication checks passed. Phase 5 build, lint, TypeScript, unit, and HTTP e2e checks pass. The tests cover authentication boundaries, Admin role checks, owner-scoped crops, request validation, and existing global HTTP behavior. Test probe endpoints exist only in the test module.

## Phase 3 status and limitations

The six entities, their relationships and the initial migration are implemented and applied to the dedicated local `cropwise_db`. The database contains the six project tables, five foreign keys and the TypeORM migration tracking table. The local `.env` is Git-ignored. On another machine, configure its own `.env`, start MySQL, then run `npm run db:create`, `npm run db:check` and `npm run db:migration:run`. Verify the six tables and foreign keys in phpMyAdmin. The application intentionally refuses to start in development or production if required DB settings are missing. Test mode skips the database module so HTTP configuration tests do not need MySQL. Existing databases remain untouched.

Farm activity, harvest, inventory, inventory transactions, full API documentation, and final project deliverables remain pending their respective phases. Configuration follows the official NestJS [TypeORM](https://docs.nestjs.com/data/typeorm), [configuration](https://docs.nestjs.com/techniques/configuration), [validation](https://docs.nestjs.com/techniques/validation), [Passport](https://docs.nestjs.com/recipes/passport), and [authentication](https://docs.nestjs.com/security/authentication) documentation.
