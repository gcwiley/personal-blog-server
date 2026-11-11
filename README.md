# Personal Blog Web Application

## Introduction

A Node.js/Express REST API backend for a personal blog web application. Serves an Angular SPA from
`dist/my-blog-client/browser` and exposes a JSON API under `/api`.

The API provides three resource groups:

- **Posts** — full CRUD for blog posts, plus paginated listing, full-text search across title, category, and date, a recent-posts feed, and a post count endpoint.
- **Users** — authenticated profile management (read, update, delete) scoped to the signed-in user.
- **Auth** — Uses **OAuth2 Proxy** as an authentication gateway

In production the server runs on Google App Engine (Node.js 24), connects to a Cloud SQL PostgreSQL instance over a Unix socket, loads secrets from Google Cloud Secret Manager, and stores uploaded files in Google Cloud Storage. In development it connects to a local PostgreSQL instance over TCP using credentials from a `.env` file.

## Tech Stack

- **Runtime**: Node.js 24 (ESM modules — `"type": "module"` in `package.json`)
- **Framework**: Express 5
- **Database**: PostgreSQL via Sequelize ORM (hosted on Google Cloud SQL)
- **Auth**: Uses **OAuth2 Proxy** as an authentication gateway.
- **File Storage**: Google Cloud Storage (via `multer` + `@google-cloud/storage`)
- **Secrets**: Google Cloud Secret Manager (production) / `.env` file (development)
- **Deploy Target**: Google App Engine (`app.yaml`, `nodejs24` runtime)

## Security

- **CORS** — restricted to the configured `CORS_ORIGIN`
- **Rate limiting** — 100 requests / 15 min on all `/api` routes; stricter 20 requests / 15 min on `/api/auth`
- **JWT** — HS256, verified on every protected request; `JWT_SECRET` is required at startup
- **Trust proxy** — enabled for accurate IP detection behind Google App Engine

## Scripts

```bash
npm run dev         # Start dev server with nodemon
npm start           # Start production server
npm run check       # Run linting/checks
npm run check-env   # Verify required environment variables are set
npm run deploy      # Deploy to Google App Engine
npm run logs        # Tail App Engine logs
npm run db-backup   # Back up the Cloud SQL database
```

## Running the Project

```bash
npm run dev     # development (nodemon)
npm start       # production (node)
