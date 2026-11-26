
# ReviewDesk — AI-Powered Review Management Platform

A full-stack, multi-tenant review management platform
that helps businesses manage customer feedback through
QR codes, NFC, AI-assisted reviews, and analytics.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma)
![Ant Design](https://img.shields.io/badge/Ant_Design-0170FE?style=flat-square&logo=antdesign)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![AI](https://img.shields.io/badge/AI-Groq-F55036?style=flat-square)
![Playwright](https://img.shields.io/badge/Testing-Playwright-2EAD33?style=flat-square)

## Overview

ReviewDesk is an independently developed full-stack
application demonstrating multi-tenant architecture,
AI integration, secure authentication, role-based
authorization, relational database design, and
responsive dashboard development.

## Key Features

- Multi-tenant merchant management
- Business and branch management
- QR code generation and NFC-compatible review links
- AI-assisted customer review generation
- Google Review handoff
- Merchant and administrator dashboards
- Review analytics and conversion tracking
- Role-based access control (RBAC)
- Server-side tenant isolation
- Responsive mobile-first interfaces
- Unit, integration, and end-to-end tests

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Ant Design 6, Tailwind CSS 4 |
| Backend | Next.js Server Actions, Server Components |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Authentication | Auth.js, JWT, bcrypt |
| Authorization | RBAC, Tenant-based access control |
| AI Integration | Groq SDK |
| Validation | Zod |
| Testing | Playwright, Node.js Test Runner |
| Code Quality | ESLint, Prettier |

## Engineering Highlights

### Multi-Tenant Architecture

Merchant data is isolated through server-side ownership
validation and tenant-scoped database queries.

### Authentication and Authorization

Auth.js Credentials, bcrypt password hashing, JWT sessions,
role-based permissions, and server-side authorization checks.

### AI-Assisted Review Workflow

Customers access a public review page through QR or NFC,
select their experience, generate review suggestions,
edit their preferred review, and manually submit it to Google.

### Data Integrity

Relational database modeling, unique constraints,
indexed ownership relationships, and idempotent
review-session interactions.

### Testing Strategy

Unit, integration, and end-to-end tests cover validation,
authentication, tenant isolation, business management,
QR workflows, and analytics.

## System Architecture

```mermaid
flowchart TD
    A[Merchant / Admin] --> B[Next.js Dashboard]
    C[Customer] --> D[QR / NFC Review Page]
    B --> E[Server Actions and Services]
    D --> E
    E --> F[Authentication and Authorization]
    E --> G[Prisma ORM]
    G --> H[(PostgreSQL)]
    E --> I[AI Review Generation]
    I --> J[Groq]
    D --> K[Google Review Handoff]
```

## Author

**Khurshed Khan**

Senior Frontend & Full-Stack Developer | 9+ Years

- [Portfolio](https://www.khurshedkhan.dev/)
- [GitHub](https://github.com/khurshed52)

---

## Technical Documentation

