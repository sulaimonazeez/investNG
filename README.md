<div align="center">

# InvestNG

**Node.js · Express · MongoDB · Vercel**

A secure REST API backend for an investment platform built for the Nigerian market. Handles user authentication, investment plans, admin controls, file uploads, and bank transfer workflows.

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://mongoosejs.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://invest-ng.vercel.app)

🌐 **Live API:** [invest-ng.vercel.app](https://invest-ng.vercel.app)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Getting Started](#getting-started)
6. [API Reference](#api-reference)
7. [Authentication](#authentication)
8. [Security](#security)
9. [Deployment](#deployment)

---

## Overview

InvestNG is a backend API for a Nigerian investment platform (RIO Investment). It provides:

- **User registration & login** with JWT authentication
- **Investment plan management** — browse, select, and track plans
- **Admin dashboard** — protected routes for platform management
- **File uploads** via Multer (KYC documents, profile images)
- **Bank transfer workflow** — stores bank details for manual transfer confirmation
- **Rate limiting & security headers** — production-ready security out of the box

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB via Mongoose |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| File Uploads | Multer |
| Validation | express-validator |
| Security | Helmet · express-rate-limit |
| Unique IDs | UUID |
| Deployment | Vercel |

---

## Project Structure

```
├── server.js              # Entry point — Express app & middleware
├── vercel.json            # Vercel deployment config
├── package.json
├── .env.example           # Environment variable template
├── .gitignore
│
├── config/                # Database connection & app config
├── controllers/           # Route handler logic
├── middleware/            # Auth guards, error handlers, upload config
├── models/                # Mongoose schemas (User, Investment, etc.)
├── routes/                # Express route definitions
└── utils/
    └── seed.js            # Database seeder (npm run seed)
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/investnaija

# JWT
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d

# Admin
ADMIN_SECRET_KEY=admin_registration_secret_change_me

# App URLs
APP_NAME=InvestNaija
APP_URL=http://localhost:3000
API_URL=http://localhost:5000

# Bank Transfer Details
BANK_NAME=Guaranty Trust Bank
BANK_ACCOUNT_NUMBER=your_account_number
BANK_ACCOUNT_NAME=InvestNaija Limited
```

> **Never commit your `.env` file.** It is listed in `.gitignore`. Set all variables in the Vercel dashboard for production.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A MongoDB Atlas cluster

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/sulaimonazeez/investNG.git
cd investNG

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your values

# 4. (Optional) Seed the database with initial data
npm run seed

# 5. Start the development server
npm run dev
```

The API will be available at `http://localhost:5000`.

---

## API Reference

**Base URL:** `https://invest-ng.vercel.app`

All authenticated endpoints require:
```
Authorization: Bearer <token>
```

---

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Login and get JWT | Public |
| `GET` | `/api/auth/me` | Get current user profile | ✅ Required |

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName":    "Ada Obi",
  "email":       "ada@example.com",
  "phone":       "08012345678",
  "password":    "securepassword"
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "<jwt>",
  "user": {
    "id": "...",
    "fullName": "Ada Obi",
    "email": "ada@example.com"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email":    "ada@example.com",
  "password": "securepassword"
}
```

**Response `200`**
```json
{
  "success": true,
  "token": "<jwt>",
  "user": { "id": "...", "fullName": "Ada Obi", "email": "ada@example.com" }
}
```

> Store the `token` securely and pass it as `Authorization: Bearer <token>` on all subsequent requests. Token expires in **7 days**.

---

### Investment Plans

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/plans` | List all available investment plans | ✅ Required |
| `GET` | `/api/plans/:id` | Get a single plan | ✅ Required |
| `POST` | `/api/investments` | Subscribe to a plan | ✅ Required |
| `GET` | `/api/investments` | Get user's active investments | ✅ Required |

---

### Bank Transfer

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/bank-details` | Get platform bank details for transfer | ✅ Required |
| `POST` | `/api/investments/confirm` | Submit payment confirmation | ✅ Required |

---

### Admin

> Admin routes require registration with the `ADMIN_SECRET_KEY` environment variable.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/admin/register` | Create an admin account | Admin Key |
| `GET` | `/api/admin/users` | List all users | ✅ Admin |
| `GET` | `/api/admin/investments` | List all investments | ✅ Admin |
| `PUT` | `/api/admin/investments/:id` | Update investment status | ✅ Admin |

---

### File Uploads

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/upload` | Upload a file (KYC / profile image) | ✅ Required |

Supported formats: `image/jpeg`, `image/png`, `application/pdf`  
Max size: `5MB`

---

## Authentication

1. Call `POST /api/auth/login` — returns a JWT in the response body
2. Store the token (memory or secure storage — **not** `localStorage` in production web apps)
3. Send on every protected request:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```
4. Token expires after **7 days** — user must re-login

---

## Security

- **Helmet** — sets secure HTTP response headers
- **express-rate-limit** — prevents brute-force and abuse
- **bcryptjs** — passwords hashed with salt rounds before storage
- **JWT** — stateless auth; secret stored only in environment variables
- **express-validator** — all inputs validated and sanitised before processing
- **Admin Secret Key** — admin registration gated behind a server-side secret, not just a role flag

---

## Deployment

The project deploys to **Vercel** with zero configuration:

```bash
npx vercel --prod
```

`vercel.json` routes all traffic to `server.js`. Set all environment variables in the Vercel dashboard under **Project → Settings → Environment Variables** before deploying.

```bash
# Useful scripts
npm start       # Production server
npm run dev     # Development with nodemon (auto-restart)
npm run seed    # Seed database with initial plans/data
```

---

## License

MIT
