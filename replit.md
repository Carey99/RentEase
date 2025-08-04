# RentEase

## Overview

RentEase is a property rental management web application that provides separate dashboards for landlords and tenants. The application features a Replit-style split-screen onboarding process, allowing users to register as either landlords or tenants. Landlords can manage properties, track tenants, and monitor revenue, while tenants can view their apartment details, manage bills, and track payment history.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with role-based navigation
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for type-safe forms

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database serverless PostgreSQL
- **Authentication**: Session-based authentication without external providers
- **API Design**: RESTful endpoints with structured error handling and logging

### Data Storage Solutions
- **Database Schema**: Three main entities - users, properties, and tenant_properties
- **ORM**: Drizzle ORM with schema validation using drizzle-zod
- **Migrations**: Database migrations managed through drizzle-kit
- **Storage Layer**: Abstracted storage interface with in-memory implementation for development

### Authentication and Authorization
- **Authentication Flow**: Multi-step onboarding with role-based registration (landlord/tenant)
- **Password Storage**: Plain text storage (development only - needs encryption for production)
- **Session Management**: Basic session handling without external session stores
- **Role-Based Access**: Different dashboard experiences based on user role

### External Dependencies
- **Database**: Neon Database serverless PostgreSQL instance
- **UI Framework**: Radix UI primitives for accessible component foundation
- **Build Tools**: Vite for development server and production builds
- **Development**: Replit-specific plugins for development environment integration

The application follows a clean separation between client and server code, with shared TypeScript types and validation schemas. The architecture supports both development and production environments with appropriate build configurations.