# Overview

This is "Biret Tera", an Ethiopian construction materials marketplace application built as a full-stack web application. The platform connects buyers with suppliers of construction materials like steel, iron, and other building supplies. It features a mobile-first React frontend with a Node.js/Express backend, using PostgreSQL for data persistence and Replit's authentication system for user management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript in a mobile-first design approach
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds
- **Design System**: Custom color palette with Ethiopian marketplace theming (primary: #BB3E00, secondary: #657C6A, accent: #F7AD45)

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Replit's built-in OIDC authentication system with session-based management
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful endpoints with consistent error handling and logging middleware

## Database Design
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Entities**:
  - Users (5 account types: buyer, seller, dealer, importer, manufacturer; accountTypeSelected flag drives onboarding modal; contactPerson field for company contact)
  - Products (construction materials with categories, pricing, and seller relationships)
  - Categories (Steel, Iron, Construction with icon support)
  - Subscriptions (tiered access control)
  - Favorites (user product bookmarking)
  - Calculations (metal weight and TMT calculations with history)
  - Sessions (mandatory for Replit Auth)

## Authentication & Authorization
- **Provider**: Replit OIDC with automatic user provisioning
- **Session Management**: Secure HTTP-only cookies with PostgreSQL storage
- **User Types**: Buyer (free) plus 4 seller-type roles (seller, dealer, importer, manufacturer) gated by subscription for product listing
- **Protection**: Route-level authentication middleware with unauthorized error handling

## Key Features
- **Product Marketplace**: Browse, search, and filter construction materials by category
- **User Management**: Profile management with buyer/seller role switching
- **Subscription System**: Seller-type accounts get a 20-day free trial, then 990 ETB/month (or 9,900 ETB/year) to list products; buyers are free. Payment integration is a placeholder. Product creation returns 402 without an active subscription.
- **Seller Storefronts**: Public pages at /seller/:id showing seller contact info (business name, contact person, phone, email, location) and active products; home page has Top Sellers / Top Importers / Top Manufacturers sections
- **Product Listings**: Support discount price, specifications, and features fields shown on cards and detail pages
- **Construction Calculators**: Metal weight and TMT steel calculations with result persistence
- **Favorites System**: Product bookmarking for registered users
- **Mobile-First UI**: Bottom navigation and responsive design optimized for mobile devices

# External Dependencies

## Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket connections
- **Replit Authentication**: OIDC-based authentication and user management system
- **Replit Development**: Integration with Replit's development environment and cartographer

## Frontend Libraries
- **React Query**: Server state management and data fetching
- **Radix UI**: Headless UI component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Wouter**: Lightweight routing library for single-page navigation
- **React Hook Form**: Form state management with validation
- **Zod**: Schema validation for forms and API data

## Backend Libraries
- **Drizzle ORM**: Type-safe database operations and query building
- **Express.js**: Web application framework with middleware support
- **Passport.js**: Authentication middleware for OIDC integration
- **Connect-PG-Simple**: PostgreSQL session store for Express sessions

## Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration