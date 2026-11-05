<div align="center">

# ⚙️ BookNook Backend API

### RESTful Express API for the BookNook Online Library.

Manages book collections and borrowing records in MongoDB while securing private operations with Better Auth JWT verification.

[![Backend API](https://img.shields.io/badge/API-BookNook_Backend-16A34A?style=for-the-badge&logo=express&logoColor=white)](https://booknook-backend-two.vercel.app)
[![Frontend](https://img.shields.io/badge/Frontend-BookNook_Client-2563EB?style=for-the-badge&logo=next.js&logoColor=white)](https://booknook-client-six.vercel.app)

</div>

---

## 🌐 Live URLs

| Service | URL |
| :--- | :--- |
| **Backend API** | [booknook-backend-two.vercel.app](https://booknook-backend-two.vercel.app) |
| **Frontend Application** | [booknook-client-six.vercel.app](https://booknook-client-six.vercel.app) |

---

## 🚀 Features

- 📚 **CRUD Operations:** Create, list, view, update, and delete books seamlessly.
- 👤 **User Contributions:** List books belonging specifically to the authenticated user.
- 🔄 **Borrow & Return System:** Borrow available books and return borrowed books.
- 📊 **Inventory Tracking:** Automatically track and update `availableCopies` upon borrowing or returning.
- 🛡️ **Borrow Safeguards:** Prevent duplicate borrowing and block requests when no copies are available.
- 🪪 **JWT Verification:** Verify Better Auth JWTs dynamically using remote JWKS.
- 🔒 **Ownership Enforcement:** Enforce strict ownership checks for updating or deleting books.

---

## 🧰 Tech Stack

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-Runtime-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Framework-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Native_Driver-47A248?style=flat-square&logo=mongodb&logoColor=white)
![JOSE](https://img.shields.io/badge/jose-JWT_Verification-6366F1?style=flat-square)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

- **Runtime & Framework:** Node.js, Express.js
- **Database:** MongoDB (Native Node.js Driver)
- **Authentication & Security:** `jose` (Remote JWKS JWT verification), `cors`, `dotenv`
- **Deployment:** Vercel

---

## ⚙️ Getting Started

### 1. Clone and install dependencies

```bash
git clone YOUR_BACKEND_REPOSITORY_URL
cd YOUR_BACKEND_PROJECT_FOLDER
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=8000
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
BETTER_AUTH_URL=http://localhost:3000
```

> **Note for Production:** `BETTER_AUTH_URL` must be set to the deployed Next.js frontend origin:
> ```env
> BETTER_AUTH_URL=[https://booknook-client-six.vercel.app](https://booknook-client-six.vercel.app)
> ```
> Never commit `.env` files or expose database credentials.

### 3. Run the server

```bash
npm run dev
```

Local API origin: [http://localhost:8000](http://localhost:8000)

---

## 📡 API Endpoints

Protected endpoints require a valid Better Auth JWT in the request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | Check backend API health status |
| `GET` | `/books` | Public | List all books in the library |
| `POST` | `/add-book` | Protected | Add a new book to the library |
| `GET` | `/books/:id` | Protected | Get detailed information for a specific book |
| `PATCH` | `/books/:id` | Protected | Update an existing book (Owner only) |
| `DELETE` | `/books/:id` | Protected | Delete an existing book (Owner only) |
| `GET` | `/my-books/:email` | Protected | List books contributed by the authenticated user |
| `POST` | `/borrows` | Protected | Borrow an available book |
| `GET` | `/borrows/:email` | Protected | List active borrows for the authenticated user |
| `DELETE` | `/borrows/:id` | Protected | Return a borrowed book |

> **Security Note:** The `:email` path parameter is not trusted for authorization. The API strictly filters records using the verified identity extracted from the JWT payload.

---

## 🔑 JWT Verification

The API extracts the Bearer token from the `Authorization` header and verifies it against the Better Auth JWKS endpoint:

```text
${BETTER_AUTH_URL}/api/auth/jwks
```

- `BETTER_AUTH_URL` must match the Better Auth issuer configuration on the frontend.
- Requests with missing, expired, or invalid tokens receive an `HTTP 401 Unauthorized` response.

---

## 🗄️ MongoDB Structure

- **Database:** `BookNook`
- **Collections:**
  - `books` — Stores book metadata, contributor details, and `availableCopies`.
  - `borrows` — Stores active borrowing records linking users and books.

Borrowing a book decrements `availableCopies` by `1`, while returning a book restores the count.

---

## 🧪 Example Requests

**Public request (List books):**

```bash
curl [https://booknook-backend-two.vercel.app/books](https://booknook-backend-two.vercel.app/books)
```

**Protected request (Get user's contributed books):**

```bash
curl [https://booknook-backend-two.vercel.app/my-books/example@email.com](https://booknook-backend-two.vercel.app/my-books/example@email.com) \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ☁️ Deployment

The backend is deployed on **Vercel**.

1. Import the backend repository into Vercel.
2. Configure `MONGODB_URI` and `BETTER_AUTH_URL` in the Vercel project settings.
3. Ensure MongoDB Atlas Network Access permits connections from Vercel (`0.0.0.0/0`).
4. Confirm the Express entry point matches your `vercel.json` configuration.
5. Deploy and inspect Vercel Function Logs for any startup issues.
6. Test both public and protected routes using a valid JWT.

---

## 🔒 Security Best Practices

- Never commit `.env` files, database credentials, or secrets to version control.
- Keep all private routes behind the JWT verification middleware.
- Enforce resource ownership using the verified JWT user identity rather than client-supplied parameters.
- Validate MongoDB `ObjectId` parameters and sanitize request bodies before querying.
- Use HTTPS in production and restrict CORS to trusted frontend origins.

---

<div align="center">

**Powering 📚 BookNook — Built with Express & MongoDB.**

[Frontend Live](https://booknook-client-six.vercel.app) · [Backend API](https://booknook-backend-two.vercel.app)

</div>
