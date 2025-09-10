# Multi-Level Comment System

> A minimal backend for posts with multi-level (threaded) comments, pagination, expandable replies, authentication, moderation, and rate-limiting — built with Node.js, Express, and MongoDB (Mongoose).

---

## Table of contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [Available scripts](#available-scripts)
4. [API Endpoints](#api-endpoints)

   * Auth
   * Posts
   * Comments (pagination + expandable replies)
   * Moderation
5. [Data models](#data-models)
6. [Security & Rate-limiting](#security--rate-limiting)
7. [Tests](#tests)
8. [Project structure](#project-structure)
9. [Deployment notes & next steps](#deployment-notes--next-steps)
10. [License](#license)

---

## Quick start

Prereqs:

* Node.js v18+ (used v22)
* Git
* A MongoDB instance — (recommended: MongoDB Atlas free tier)

Clone and install:

```bash
git clone <your-repo-url>
cd multi-level-comment-system
npm install
```

Create a `.env` in the project root and add your settings (see next section). Then run:

```bash
# development (auto-restarts)
npm run dev

# run tests
npm test
```

Open `http://localhost:4000/health` to confirm the server is running.

---

## Environment variables

Create `.env` with these keys (example):

```
PORT=4000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/<db>?retryWrites=true&w=majority
JWT_SECRET=change_this_to_a_long_random_string

# rate limiting (ms + max)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10

# route-specific limits
RATE_LIMIT_POSTS_MAX=5
RATE_LIMIT_COMMENTS_MAX=20
```

> Keep `.env` out of source control (already in `.gitignore`).

---

## Available scripts

* `npm run dev` — start with `nodemon` (development)
* `npm start` — start in production mode (`node server.js`)
* `npm test` — run tests with Jest (in-memory MongoDB)

---

## API Endpoints

All endpoints are under `/api`. Requests & example responses below use JSON and assume server running at `http://localhost:4000`.

### Auth

#### POST `/api/auth/register`

Register a user.

Request:

```json
{
  "username": "bob",
  "email": "bob@example.com",
  "password": "password123"
}
```

Response (201):

```json
{
  "token": "<jwt>",
  "user": { "id": "...", "username":"bob","email":"bob@example.com","role":"user" }
}
```

#### POST `/api/auth/login`

Login by username or email.

Request:

```json
{ "emailOrUsername": "bob", "password": "password123" }
```

Response (200):

```json
{ "token": "<jwt>" }
```

Use the `token` as: `Authorization: Bearer <token>` header for protected endpoints.

---

### Posts

#### GET `/api/posts`

List posts.

#### POST `/api/posts` (protected)

Create a post.

Headers:

```
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{ "title": "My Post", "body": "Hello world" }
```

Response (201): created post object.

---

### Comments

#### POST `/api/comments` (protected)

Create a top-level comment or reply.

Body:

```json
{ "postId": "<postId>", "body": "Nice post!", "parentCommentId": "<optional parent id>" }
```

* If `parentCommentId` is provided, this comment is a reply; the server records `ancestors`.

Response (201): created comment.

**Rate-limited**: controlled by `RATE_LIMIT_COMMENTS_MAX`.

#### GET `/api/comments/:postId?limit=10&page=1`

Get **paginated top-level comments** for a post, with `replyCount` for each top-level comment.

Example:

```
GET /api/comments/68c0cef17bde9b0624486090?limit=2&page=1
```

Response:

```json
{
  "totalTopLevel": 12,
  "page": 1,
  "pages": 6,
  "limit": 2,
  "results": [
    { "comment": { /* top-level comment object */ }, "replyCount": 3 },
    ...
  ]
}
```

#### GET `/api/comments/replies/:commentId?limit=5&page=1`

Get **paginated immediate replies** for a comment (one level).

Response:

```json
{
  "totalReplies": 3,
  "page": 1,
  "pages": 1,
  "limit": 5,
  "replies": [
    { "comment": { /* reply object */ }, "replyCount": 0 },
    ...
  ]
}
```

#### PATCH `/api/comments/:id` (protected + owner-only)

Edit your comment body. Sets `isEdited = true`.

Body:

```json
{ "body": "Edited comment text" }
```

#### DELETE `/api/comments/:id` (protected + owner-only)

Soft-delete your comment (sets `isDeleted: true` and replaces body with `"[deleted]"`).

---

### Moderation (moderator/admin only)

> Endpoints require the user to have `role: 'moderator'` or `role: 'admin'`.

#### DELETE `/api/moderation/comment/:id`

Permanently delete a comment (hard-delete). Creates a moderation log.

Body:

```json
{ "reason": "spam" }
```

Response:

```json
{ "message": "Comment permanently deleted" }
```

#### POST `/api/moderation/comment/:id/restore`

Restore a soft-deleted comment (moderator provides restored body).

Body:

```json
{ "body": "Restored text", "reason": "reviewed" }
```

#### GET `/api/moderation/logs?limit=10&page=1`

Get paginated moderation logs. Each entry includes `moderator`, `action`, `targetType`, `targetId`, `metadata`, timestamps.

---

## Data models (high-level)

### `User`

* `_id`
* `username` (min length 3)
* `email` (unique)
* `password` (hashed, bcrypt)
* `role` (string: `user` | `moderator` | `admin`)
* timestamps

### `Post`

* `_id`
* `title`, `body`
* `author` (ref `User`)
* `commentCount` (number)
* timestamps

### `Comment`

* `_id`
* `body`
* `author` (ref `User`)
* `post` (ref `Post`)
* `parentComment` (ref `Comment` or `null`)
* `ancestors` (array of ObjectId)
* `isEdited` (bool)
* `isDeleted` (bool)
* timestamps

### `ModerationLog`

* `moderator` (ref `User`)
* `action` (`hard_delete` | `restore`)
* `targetType` (`comment` | `post` | `user`)
* `targetId` (ObjectId)
* `reason` (string)
* `metadata` (object)
* timestamps

---

## Security & Rate-limiting

* JWT-based auth (`JWT_SECRET` in `.env`).
* Rate limiting is implemented with `express-rate-limit` (configurable via `.env`):

  * Global default window: `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
  * Posts/comment creation have specific limits:

    * `RATE_LIMIT_POSTS_MAX`
    * `RATE_LIMIT_COMMENTS_MAX`
* Ownership middleware ensures only resource owners can edit/delete their comments.
* Moderation endpoints require `moderator` or `admin` role.

---

## Tests

We use Jest + supertest + mongodb-memory-server (in-memory tests).

Install dev deps and run:

```bash
npm install
npm test
```

* Tests cover: registration/login, creating posts/comments, replies, pagination, moderation (hard-delete + logs).
* Tests run against an in-memory MongoDB to avoid touching production/Atlas.

---

## Examples (PowerShell & curl)

**Register**
PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/register -ContentType 'application/json' -Body (ConvertTo-Json @{ username='bob'; email='bob@example.com'; password='password123' })
```

**Login**
PowerShell:

```powershell
$body = '{"emailOrUsername":"bob","password":"password123"}'
$resp = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method Post -Headers @{ 'Content-Type'='application/json' } -Body $body
$token = $resp.token
```

**Create comment (authenticated)**
PowerShell (after obtaining `$token`):

```powershell
$headers = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token" }
$body = '{"postId":"<POST_ID>","body":"Nice post!"}'
Invoke-RestMethod -Uri 'http://localhost:4000/api/comments' -Method Post -Headers $headers -Body $body
```

**Get paginated top-level comments**
curl:

```bash
curl "http://localhost:4000/api/comments/<POST_ID>?limit=5&page=1"
```

**Hard-delete comment (moderator)**
PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/moderation/comment/<COMMENT_ID>" -Method Delete -Headers $headers -Body '{"reason":"spam"}'
```

---

## Project structure (important files)

```
.
├─ controllers/
│  ├─ authController.js
│  ├─ commentController.js
│  ├─ postController.js
│  └─ moderationController.js
├─ models/
│  ├─ User.js
│  ├─ Post.js
│  ├─ Comment.js
│  └─ ModerationLog.js
├─ routes/
│  ├─ auth.js
│  ├─ posts.js
│  ├─ comments.js
│  └─ moderation.js
├─ middlewares/
│  ├─ auth.js
│  ├─ ownership.js
│  ├─ authorizeRole.js
│  └─ rateLimit.js
├─ config/
│  └─ db.js
├─ tests/
│  ├─ auth.test.js
│  ├─ posts_comments.test.js
│  ├─ moderation.test.js
│  └─ test-setup.js
├─ server.js
├─ package.json
└─ README.md
```

---

## Deployment notes & next steps

* **Environment**: Ensure `JWT_SECRET` is long & random. Do not commit `.env`.
* **Production DB**: Use a managed MongoDB (Atlas), add network/IP and user auth security.
* **Reverse proxy**: Put behind Nginx or similar; enable HTTPS.
* **Rate limiting**: For scale, use a shared store (Redis) for rate-limiter state across multiple instances.
* **Monitoring**: Add logging & an APM (Sentry, Datadog).
* **CI/CD**: Run `npm test` in CI; on green, deploy to staging/production.
* **Front-end**: Build a UI that fetches paginated top-level comments and calls `/replies/:id` to expand replies on demand (keeps payload small).
* **Optional**: Implement webhooks or event queue for heavy moderation activity analytics.

---

## Contributing

* Open issues describing bug/feature.
* Prefer small PRs with tests.
* Run `npm test` before PR.

---




