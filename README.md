# Document Signature App

A secure, full-stack web application for uploading documents, placing digital signatures, sharing signing links, and generating legally traceable signed PDFs — similar to DocuSign and Adobe Sign.

## Features

- **JWT Authentication** — Access + refresh tokens with protected routes
- **PDF Upload & Management** — Secure document storage with ownership control
- **Drag-and-Drop Signature Placement** — Position signatures on PDF pages using dnd-kit
- **Server-Side PDF Modification** — Embed signatures into PDFs using PDF-Lib
- **Tokenized Public Signing Links** — Share `/sign/:token` URLs with external signers
- **Audit Logs** — Timestamps, IP addresses, and action history
- **Document Lifecycle** — Pending → Signed → Rejected status tracking

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, Vite, TypeScript, Tailwind CSS, react-pdf, dnd-kit, Axios, React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Auth | JWT (access + refresh tokens) |
| PDF | pdf-lib, multer |

## Project Structure

```
Project1/
├── backend/          # Express API server
│   ├── src/
│   │   ├── routes/   # auth, docs, signatures, audit
│   │   ├── models/   # User, Document, Signature, AuditLog
│   │   └── utils/    # JWT, PDF embedding, audit helpers
│   └── uploads/      # Local PDF storage (dev)
└── frontend/         # React SPA
    └── src/
        ├── pages/    # Login, Dashboard, Document detail, Public sign
        └── components/
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/docs/upload` | Upload PDF |
| GET | `/api/docs/` | List user documents |
| GET | `/api/docs/:id` | Get document metadata |
| GET | `/api/docs/:id/file` | Download/view PDF |
| GET | `/api/docs/share/:token` | Public document info |
| GET | `/api/docs/share/:token/file` | Public PDF view |
| PATCH | `/api/docs/:id/reject` | Reject document |
| DELETE | `/api/docs/:id` | Delete document |

### Signatures
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signatures` | Save signature position (authenticated) |
| POST | `/api/signatures/public` | Save position via share link |
| GET | `/api/signatures/:id` | Get signatures for document |
| POST | `/api/signatures/finalize` | Embed signature into PDF |
| POST | `/api/signatures/finalize/public` | Public finalize |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/:docId` | Get audit trail for document |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`) or a MongoDB Atlas connection string

Optional: start local MongoDB with Docker:

```bash
docker compose up -d
```

### Quick Start (both apps)

From the project root:

```bash
npm run install:all
```

Terminal 1 — backend:

```bash
npm run dev:backend
```

Terminal 2 — frontend:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`

## Usage Flow

1. **Register / Login** — Create an account or sign in
2. **Upload PDF** — Upload a document from the dashboard
3. **Place Signature** — Open the document, click or drag to place a signature field
4. **Draw & Sign** — Draw your signature and click "Sign & Finalize"
5. **Share Link** — Copy the signing link to send to external signers
6. **Audit Trail** — View who signed, when, and from which IP

## Mock Data Examples

**User:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "hashedpassword"
}
```

**Signature:**
```json
{
  "documentId": "abc123",
  "userId": "xyz456",
  "x": 120,
  "y": 330,
  "page": 1,
  "status": "signed"
}
```

## Deployment

| Component | Recommended Platform |
|-----------|---------------------|
| Frontend | Vercel / Netlify |
| Backend | Render / Railway |
| Database | MongoDB Atlas |
| Storage | AWS S3 / Supabase Storage (prod) |

## License

MIT
