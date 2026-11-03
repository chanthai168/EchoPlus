# Backend Application

A backend API built with [NestJS](https://nestjs.com/) and [Prisma](https://www.prisma.io/), documented with Swagger, authentication with clerk (https://clerk.com/). 


## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database & Prisma](#database--prisma)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm
- [Docker](https://www.docker.com/) (required for running tests)
- A supported database (e.g. PostgreSQL) configured in your `.env` file

## Getting Started

1. **Clone the repository**

```bash
   git clone <repository-url>
   cd <project-folder>
```

2. **Install dependencies**

```bash
   npm install
```

3. **Configure environment variables**

   Create a `.env` file in the project root:

```env
   DATABASE_URL="<your-database-connection-string>"
   PORT=8000
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
```

4. **Set up the database** (see [Database & Prisma](#database--prisma))

```bash
   npx prisma migrate dev
```

## Running the Application

### Development Mode (Recommended)

Starts the application with live reload for a better development experience:

```bash
npm run start:dev
```

The server will be available at `http://localhost:8000`.

## API Documentation

Interactive Swagger UI is available while the app is running:

```text
http://localhost:8000/api
```

## Database & Prisma

### Sync Schema Directly (No Migration History)

Pushes schema changes straight to the database without creating migration files. Recommended for prototyping and early development:

```bash
npx prisma db push
```

### Create and Apply Migrations (With History)

Creates versioned migration files and applies them. Recommended for production and collaborative environments:

```bash
npx prisma migrate dev
```

> **Tip:** Use one approach consistently. Mixing `db push` and `migrate dev` can cause schema drift.

## Testing

### Prerequisites

- Docker must be running.
- Prisma migrations must be present in `prisma/migrations`.

### Test Commands

| Command                    | Description                |
| -------------------------- | -------------------------- |
| `npm run test:unit`        | Run unit tests             |
| `npm run test:integration` | Run integration tests      |
| `npm run test:e2e`         | Run end-to-end tests       |
| `npm run test:all`         | Run all test suites        |

## Troubleshooting

- **Tests fail to start:** Confirm Docker is running and that `prisma/migrations` exists (run `npx prisma migrate dev` if not).
- **Cannot connect to the database:** Check that `DATABASE_URL` in `.env` is correct and the database is running.
- **Port already in use:** Change `PORT` in `.env` or stop the process using port 8000.
