# CropWise Backend

CropWise: Crop Production and Farm Inventory Management System is a college project using a NestJS REST API. The planned system covers crops, farm activities, harvests, inventory and inventory transactions.

Current status: **Phase 2 configuration implemented; live MySQL connection not yet verified.** TypeORM and the MySQL driver are configured for the dedicated `cropwise_db` database. Entities, authentication, roles and business CRUD will be added in later approved phases.

## Local setup

Use Node.js and npm. This project was previously checked with Node 24.13.1 and npm 11.8.0. Some Nest CLI dependencies declare a newer minimum in the Node 24 line (24.15.0); use a compatible Node version when setting up another machine.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Start MySQL in XAMPP, then edit `.env` and set your own `DB_USERNAME` and `DB_PASSWORD`. Copy `.env.example` only if `.env` does not already exist. An empty password is accepted only when that is actually how your local MySQL account is configured. Keep credentials in `.env`; Git ignores it and allows the credential-free `.env.example`.

```powershell
npm.cmd run db:create
npm.cmd run db:check
npm.cmd run start:dev
```

`npm run db:create` issues only `CREATE DATABASE IF NOT EXISTS cropwise_db` with `utf8mb4`; it does not modify other databases. `npm run db:check` performs a read-only `SELECT 1` and confirms the selected database. `DB_DATABASE` is restricted to `cropwise_db` so the application cannot accidentally target another database. No live connection check has passed until MySQL is running and these commands succeed with your local credentials.

The existing starter endpoint is:

```http
GET http://localhost:3000/api/v1
```

It returns `Hello World!`. Starting the application also requires a successful TypeORM connection to `cropwise_db`; authentication and business endpoints are not implemented yet.

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
| `JWT_*`        | Reserved for Phase 4; authentication is not enabled yet                      |

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
    database-options.ts         Shared MySQL connection and migration options
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

Feature folders for Auth, Users, Crops, Farm Activities, Inventory, Inventory Transactions and Harvests will be added in the approved phases. No empty feature modules have been added.

## Database commands

```powershell
npm.cmd run db:create
npm.cmd run db:check
npm.cmd run db:migration:generate -- src/database/migrations/InitialSchema
npm.cmd run db:migration:run
npm.cmd run db:migration:revert
npm.cmd run db:migration:run:prod
```

TypeORM uses `synchronize: false` and does not automatically run migrations on startup. Migration generation/run/revert commands are configured; there are no entity migrations yet because those belong to Phase 3.

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

Phase 1 validation recorded 14 unit tests and 10 HTTP tests passing, along with build, lint, TypeScript and a local HTTP smoke check. Phase 2 validation passes build, lint, TypeScript checking, 18 unit tests, 10 HTTP tests, script syntax checks, and loading the compiled TypeORM data source configuration without connecting. The live DB check remains pending because XAMPP MySQL was unavailable. The HTTP tests cover the API prefix, DTO transformation and validation, unknown properties, CORS allow/deny behavior and preflight, JSON API 404 responses, and generic 500 responses. Test probe endpoints exist only in the test module.

## Phase 2 status and limitations

The TypeORM configuration, migration CLI data source, database creation command and read-only connection check are in place. No `.env` exists in this checkout and XAMPP MySQL was not listening on port `3306` during implementation, so `cropwise_db` has not been created and a live database connection has not been verified. Add your local credentials to `.env`, start XAMPP MySQL, then run `npm run db:create` and `npm run db:check`. The application intentionally refuses to start in development or production if required DB settings are missing. Test mode skips the database module so HTTP configuration tests do not need MySQL. Existing databases remain untouched.

All later features and final project deliverables remain pending their respective phase approvals. Configuration follows the official NestJS [TypeORM](https://docs.nestjs.com/data/typeorm), [configuration](https://docs.nestjs.com/techniques/configuration), [validation](https://docs.nestjs.com/techniques/validation), and [CORS](https://docs.nestjs.com/security/cors) documentation.
