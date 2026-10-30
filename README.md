# CropWise Backend

CropWise: Crop Production and Farm Inventory Management System is a college project using a NestJS REST API. The planned system covers crops, farm activities, harvests, inventory and inventory transactions.

Current status: **Phase 1 � initial configuration implemented.** Database connection, entities, authentication, roles and business CRUD are scheduled for later phases and are not implemented yet.

## Local setup

Use Node.js and npm. This setup was tested with Node 24.13.1 and npm 11.8.0. Some installed Nest CLI dependencies declare a newer minimum in the Node 24 line (24.15.0); use a compatible Node version when setting up another machine. No system-wide Node upgrade was performed.

```powershell
npm install
Copy-Item .env.example .env
npm run start:dev
```

Copy `.env.example` only if `.env` does not already exist. Phase 1 starts without an `.env` file using local defaults. Keep real credentials in `.env`; Git excludes environment files and permits the credential-free `.env.example`.

The existing starter endpoint is now:

```http
GET http://localhost:3000/api/v1
```

It returns `Hello World!`. This only confirms that the API is running; it does not check MySQL or authentication.

## Configuration

| Variable       | Phase 1 behavior                                              |
| -------------- | ------------------------------------------------------------- |
| `NODE_ENV`     | `development`, `test`, or `production`; default `development` |
| `PORT`         | Integer from 1 to 65535; default `3000`                       |
| `CORS_ORIGINS` | Comma-separated exact HTTP(S) origins; empty by default       |
| `DB_*`         | Reserved for Phase 2; not used to connect yet                 |
| `JWT_*`        | Reserved for Phase 4; authentication is not enabled yet       |

For a future browser client, set an exact origin such as `CORS_ORIGINS=http://localhost:5173`. Paths and wildcards are rejected. Blank origins grant no cross-origin browser access. Postman and server-to-server calls do not require CORS permission. CORS is a browser policy, not authentication.

Global validation transforms declared DTO input, rejects unknown fields and rejects invalid values. Future request DTOs must use validation decorators to receive these checks. Validation responses omit the submitted target and value. Nest's built-in exception handler handles HTTP errors and returns a generic message for unexpected failures; diagnostic details are not included in the response.

Observe integration is disabled in `app.module.ts` and `main.ts` because it contained placeholder monitoring credentials. Its package remains installed; no existing source files were deleted.

## Structure

```text
src/
  common/configure-app.ts      Shared API prefix, validation and CORS setup
  config/environment.ts       Environment defaults and startup validation
  config/environment.spec.ts  Configuration tests
  app.module.ts               Application module and global ConfigModule
  app.controller.ts           Existing starter endpoint
  app.controller.spec.ts      Existing controller test
  app.service.ts              Existing starter service
  main.ts                     Server bootstrap and shutdown hooks
test/
  app.e2e-spec.ts              HTTP configuration tests
  jest-e2e.json                HTTP test runner configuration
.env.example                  Non-secret environment template
```

Feature folders for Auth, Users, Crops, Farm Activities, Inventory, Inventory Transactions and Harvests will be added with their working modules in the approved phases. Shared code already has separate `common` and `config` folders; no empty feature modules have been added.

## Checks

```powershell
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
npm run start:prod
```

Jest uses Node's experimental VM modules to support the installed NestJS 12 ESM packages. Its experimental warning is expected. TypeScript remains strict; the explicit root directory makes the TypeScript 6 test setup compile consistently.

Phase 1 validation: 14 unit tests and 10 HTTP tests passed, along with build, lint and TypeScript checks. A separate smoke check started `dist/main.js` on a temporary local port, verified the prefixed endpoint and CORS preflight, confirmed test-only routes were absent, and stopped that temporary server.

The HTTP tests cover the API prefix, DTO transformation and validation, unknown properties, CORS allow/deny behavior and preflight, JSON API 404 responses, and generic 500 responses. Test probe endpoints exist only in the test module.

## Next phase and limitations

MySQL has not been connected, and no database was created or modified during Phase 1. Phase 2 requires confirmation of the MySQL credentials before configuring TypeORM and the separate `cropwise_db` database. Existing XAMPP databases must remain untouched.

npm audit reported 11 development dependency findings (8 low, 1 moderate, 2 high), involving the existing deployment tooling (`@nestjs/mau`) and Jest dependency chains. The production-only audit (`npm audit --omit=dev`) reported zero findings. Development dependency remediation remains pending; no force updates or major downgrades were applied. An audit is not proof that the application is fully secure. All later features and final project deliverables remain pending their respective phase approvals.

Configuration follows the official NestJS [configuration](https://docs.nestjs.com/techniques/configuration), [validation](https://docs.nestjs.com/techniques/validation), and [CORS](https://docs.nestjs.com/security/cors) documentation.
