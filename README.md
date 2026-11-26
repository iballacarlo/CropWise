# CropWise Backend

CropWise is a backend API for managing crops, farm activities, harvests, users, and farm inventory. It supports JWT authentication and role-based access for Admin and Farmer accounts.

## Tech stack

- Backend framework: NestJS
- ORM: TypeORM
- Database: MySQL
- Authentication: JWT
- API testing: Postman
- Version control: Git and GitHub

## Run locally

Prerequisites: Node.js, npm, and MySQL (XAMPP may be used to run MySQL).

1. Install dependencies. If you do not already have a `.env`, create one from the example:

   ```powershell
   npm.cmd install
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

2. Start MySQL. Edit `.env` and set `DB_USERNAME` and `DB_PASSWORD` to match your local MySQL account. Set `JWT_SECRET` to a private random value of at least 32 bytes (the generation command is in `.env.example`). Keep `.env` private; do not commit it.

3. Create and verify the project database, then run its migrations:

   ```powershell
   npm.cmd run db:create
   npm.cmd run db:check
   npm.cmd run db:migration:run
   ```

4. Start the API:

   ```powershell
   npm.cmd run start:dev
   ```

   The API runs at `http://localhost:3000/api/v1`.

## Useful reports and schedules

- `GET /inventory/low-stock` lists items whose quantity is at or below the reorder level.
- `GET /farm-activities/schedule?fromDate=05%2F01%2F2026&toDate=05%2F31%2F2026` lists activities in a date range.
- `GET /harvests/production-report?fromDate=09%2F01%2F2026&toDate=09%2F30%2F2026` summarizes harvest totals by crop and unit.

These endpoints use the existing database tables and require a JWT. Farmers see records for their own crops; Admins can see all records. Low-stock results are available through the API; they do not send email or push notifications.

## Test with Postman

Import `postman/collections/CropWise.postman_collection.json` and `postman/environments/CropWise Local.postman_environment.example.json`. Set the required local environment values, select `CropWise Local`, then run the `CropWise API` collection while the API and MySQL are running. Do not export or commit an environment containing real credentials or tokens.
