# API Documentation

Base URL (local): `http://localhost:5000/api`  
Auth: Bearer access token (15m) + httpOnly refresh cookie (`refreshToken`, path `/api/auth`, 7d, rotated on refresh/logout).

Success envelope: `{ success: true, message, data }`  
Error envelope: `{ success: false, message, errors? }`

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | Public | Register (role always `user`; password hashed). Returns user; verification link logged to server console. |
| GET | `/verify-email/:token` | Public | Marks email verified (simulated email flow). |
| POST | `/login` | Public | Returns `{ accessToken, user }`; sets refresh cookie. Requires verified email. |
| POST | `/logout` | Cookie | Clears refresh cookie; bumps token version. |
| POST | `/refresh` | Cookie | Rotates refresh token; returns new `{ accessToken, user }`. |
| POST | `/forgot-password` | Public | Logs reset link to console (no email enumeration). |
| POST | `/reset-password` | Public | Body `{ token, password }` — sets new password hash. |
| GET | `/me` | Bearer | Current user from DB (role never trusted from client). |

## Posts — `/api/posts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | Feed: `sort` (`newest`\|`upvoted`\|`discussed`), `category`, `status`, `search`, `page`, `limit`. |
| GET | `/:id` | Optional | Single post (`hasVoted` when authenticated). |
| POST | `/` | User | Create feature request: `{ title, description, category }`. Status defaults to `under_review`. |
| POST | `/:id/vote` | User | Atomic upvote (`$addToSet` + `$inc`). 409 if already voted. |
| DELETE | `/:id/vote` | User | Atomic unvote (`$pull` + `$inc`). 409 if not voted. |
| GET | `/:id/comments` | Public | Threaded comments (one reply level). |
| POST | `/:id/comments` | User | Create comment/reply: `{ content, parentComment? }`. |

## Comments — `/api/comments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/:id` | Author or Admin | Update content. |
| DELETE | `/:id` | Author or Admin | Delete comment (+ child replies); adjusts `commentCount`. |

## Admin — `/api/admin` (Bearer + DB role `admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ping` | RBAC health check. |
| GET | `/posts` | Same filters as public feed. |
| PATCH | `/posts/:id/status` | Body `{ status }` ∈ `under_review`\|`planned`\|`in_progress`\|`completed`. Returns `outOfSequence` when jumping the preferred sequence. |

Non-admins receive **403**. Demoted admins are rejected even if an old JWT still claims admin (role loaded from DB).

## Categories

`UI/UX` · `Integrations` · `Performance` · `General`

## Roadmap statuses (public Kanban columns)

`planned` · `in_progress` · `completed`  
(`under_review` is feed/admin only until promoted.)

## Environment

See root `.env.example` and `client/.env.example`. Never commit `.env`.
