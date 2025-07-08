# Voidchat - Anonymous Real-Time Chat Application

## Overview

Voidchat is a minimalist, anonymous real-time chat room designed with the aesthetic of a public notepad. The application enables users to participate in ephemeral conversations without requiring registration or authentication. It features automatic message expiration, spam protection, ambient advertising, and a paid Guardian moderation system.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with custom configuration for development and production
- **Styling**: TailwindCSS with custom void-themed color palette
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: React hooks with custom WebSocket hook for real-time communication
- **Routing**: Wouter for lightweight client-side routing
- **Payment Integration**: Stripe for Guardian subscriptions and ad sponsorships

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **WebSocket Server**: Native WebSocket implementation for real-time messaging
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-based session storage

### Real-Time Communication
- **Protocol**: WebSocket for bidirectional real-time communication
- **Message Broadcasting**: Server-side client management for message distribution
- **Rate Limiting**: IP-based rate limiting with automatic blocking for spam prevention

## Key Components

### Message System
- **Anonymous Users**: Auto-generated usernames (anon{4-digit-number})
- **Message Expiration**: 15-minute TTL for all messages with automatic cleanup
- **Content Validation**: Plain text only with length restrictions (500 characters)
- **Real-Time Updates**: Instant message broadcasting to all connected clients

### Moderation System
- **Rate Limiting**: 1 message per 5 seconds per IP with escalating blocks
- **Spam Protection**: Automatic 5-minute blocks for users sending 5+ messages in 10 seconds
- **Guardian System**: Paid moderators with enhanced privileges
- **Muting Capabilities**: IP-based muting with configurable durations

### Guardian System
- **Subscription Model**: $2/day or $10/week payment tiers via Stripe
- **Moderation Powers**: Message deletion, user muting, slow mode activation
- **Action Logging**: All Guardian actions tracked for accountability
- **Time-Based Access**: Guardian status expires with subscription

### Ambient Advertising
- **Frequency**: One ad every 20 regular messages
- **Format**: Subtle, poetic sponsor messages with optional links
- **Payment Integration**: Stripe-powered ad submission and payment
- **Content Management**: JSON-based default ads with database override capability

### Data Flow
1. **User Connection**: WebSocket establishes connection, loads recent messages
2. **Message Submission**: Client validates input, server applies rate limiting
3. **Message Broadcasting**: Valid messages broadcast to all connected clients
4. **Message Expiration**: Background job removes expired messages
5. **Ad Injection**: Server tracks message count and injects ads periodically

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **ws**: WebSocket server implementation
- **stripe**: Payment processing for Guardian subscriptions and ads
- **express**: Web server framework

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI components for accessibility
- **@stripe/stripe-js** & **@stripe/react-stripe-js**: Stripe payment integration
- **wouter**: Lightweight React router
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type safety and development experience
- **drizzle-kit**: Database migration and schema management

## Deployment Strategy

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **STRIPE_SECRET_KEY**: Stripe API key for payment processing (required)
- **VITE_STRIPE_PUBLIC_KEY**: Stripe publishable key for frontend (required)
- **NODE_ENV**: Environment flag for development/production modes

### Build Process
1. **Frontend Build**: Vite compiles React application to static assets
2. **Backend Build**: esbuild bundles server code with external dependencies
3. **Database Setup**: Drizzle migrations ensure schema consistency
4. **Asset Serving**: Express serves static files in production

### Production Considerations
- **WebSocket Scaling**: Single-server architecture requires session stickiness for multi-instance deployments
- **Database Connection**: Uses connection pooling for efficient PostgreSQL usage
- **Session Storage**: PostgreSQL-based sessions for persistence across server restarts
- **Static Files**: Express serves frontend assets in production mode

## Changelog
- July 08, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates (July 8, 2025)

### Chat Interface Improvements & Registration Fix (Latest)
- **Fixed keyboard positioning**: Enhanced mobile keyboard handling with proper scroll locking and position restoration
- **Replit AI-style input**: Implemented auto-resizing textarea with proper focus states and rounded design
- **Enhanced mobile optimization**: Added visual viewport detection and dynamic keyboard adjustment for all devices
- **Scroll locking**: Input stays locked in place when keyboard appears, prevents scrolling away on mobile
- **Fixed sign up payment**: Added missing registration payment endpoints for $3 username reservation system
- **Payment integration working**: Complete Stripe payment flow for account creation now functional
- **Better iOS support**: Enhanced CSS for safe area handling and keyboard environment variables

### Account Creation System with $3 Username Reservation
- **Paid account creation**: Users pay $3 to reserve a unique username during registration
- **Two-step registration**: Details collection followed by Stripe payment processing
- **Username validation**: Real-time checking for availability and format compliance
- **Secure payment flow**: Stripe integration for $3 username reservation fee
- **Registration page**: Complete signup form with payment integration at /register
- **Account verification**: Email verification system for new accounts (placeholder)
- **Login page enhancement**: Added "Create account ($3)" link for easy access to registration

### Authentication System Fixed and Guardian Requirements Updated
- **Authentication system working**: Fixed session management for login/logout functionality
- **Guardian pricing increased**: Updated from $2/day, $10/week to $20/day, $100/week to reduce abuse
- **Guardian eligibility requirements**: Users must have either:
  - 30+ days of paid account history OR
  - 500+ messages in the last 7 days
- **UI cleanup on chat page**: Fixed header button positioning using flexbox instead of absolute positioning to prevent glitches
- **Complete payment flow working**: Guardian payment initialization now functional with authentication
- **Smart auto-scroll**: Messages only auto-scroll when user is at bottom of chat
- **Profanity filter**: Added toggle for all users (including anonymous) with swearing mouth icon, replaces curse words with ### matching letter count
- **Super user account**: Created caselka founder account with permanent Guardian access (password: fafjyc-9koVbi-jopdoz-53838)&@1-gdbbskh)

### Room System Implementation
- **Room creation feature**: Users can create permanent chat rooms for $49 USD
- **Authentication requirement**: Only paid users can create rooms 
- **Room validation**: 3-20 characters, alphanumeric with dashes/underscores, lowercase only
- **Banned names**: admin, voidchat, caselka, support, mod are reserved
- **Room features**: Permanent unique names, creator becomes moderator, free access for all
- **Room mentions**: Users can mention rooms in global chat with /room-name format
- **Database tables**: Created rooms and room_messages tables with proper relationships
- **Payment simulation**: $49 payment processing simulated for demonstration
- **Super user privileges**: Caselka can create rooms for free as founder account
- **Human verification**: Anonymous users must solve simple math captcha before accessing chat
- **Individual room pages**: Each room has dedicated page at /room/name with owner information
- **Rooms button in header**: Purple cube icon button on left side for all users to access room features
- **Fixed human verification**: Math equations no longer change while typing answers

### Sponsor Ads Enhancement and Content Moderation
- **Removed impression estimates**: Eliminated misleading impression counts from sponsor ad pricing display
- **Enhanced content screening**: Comprehensive validation for sponsor ads including:
  - Profanity and inappropriate content filtering
  - Prohibited category detection (gambling, drugs, weapons, adult content, crypto, etc.)
  - Suspicious URL screening (URL shorteners, free TLDs, phishing patterns)
  - Real-time content validation with detailed error messages
- **Improved error handling**: Clear feedback for rejected ads with specific reasons
- **Content review notice**: Added transparency about content review process

### Username Expiration System
- **30-day expiration cycle**: All paid usernames expire after 30 days
- **15-day grace period**: Users have 15 days after expiration to renew
- **Automatic cleanup**: After grace period ends, usernames become anonymous and available for others
- **Room ownership transfer**: When usernames expire, new owners can access previously created rooms
- **Clear warning system**: Registration page highlights expiration policy prominently
- **Renewal process**: $3 payment required to extend username for another 30 days

### Comprehensive Username Protection System
- **Multi-layered filtering**: System reserved terms, founder protection, profanity filtering, format validation
- **Detailed error messages**: Specific feedback for each rejection reason (reserved terms, inappropriate content, format issues)
- **Enhanced security**: Blocks system accounts, founder names, leetspeak variations, and harmful patterns
- **Format validation**: Prevents UUID formats, anon patterns, and invalid character combinations
- **Real-time feedback**: Users get immediate, clear explanations for username rejections

### Username Categories Blocked:
- **System Reserved**: voidchat, admin, moderator, guardian, system, server, support, mod, root, dev, owner, bot, null, undefined, console, test
- **Founder Protection**: caselka, cameron, cameronpettit, cam, cmp, ptcsolutions, redd (including substring matching)
- **Format Restrictions**: anonXXXX patterns, UUID formats, consecutive special characters, leading/trailing dashes
- **Profanity & Harmful Content**: Comprehensive list including leetspeak variations and character substitutions

## Previous Updates

- Mobile optimization completed with responsive design
- Logo updated to match minimalist aesthetic (lowercase "voidchat" with light font weight)
- WebSocket connection stability improved with automatic reconnection
- Touch-friendly interface for mobile devices
- Safe area support for notched devices
- Responsive text sizes and spacing across all screen sizes

### Authentication System Integration
- **Replit Auth implemented**: All payment features now require user accounts
- **Account requirement**: Custom handles, themes, and Guardian subscriptions need login
- **Dark/light theme toggle fixed**: Theme provider updated for server-side rendering compatibility
- **Payment protection**: All payment endpoints secured with authentication middleware
- **User session management**: PostgreSQL-based session storage for persistence
- **Auth navigation**: Login/logout buttons added with proper authentication state management
- **Reserved usernames**: System accounts created with permanent handles (caselka, admin, system, etc.)
- **Handle protection**: Reserved usernames are permanently unavailable for purchase
- **Landing page created**: Professional homepage with premium feature overview and pricing
- **Theme system improved**: Better dark/light mode with proper background color changes
- **UI cleanup**: Simplified navigation and improved visual consistency across all pages
- **Additional pages added**: Careers, Contact, Privacy Policy, and Terms of Service pages
- **Comprehensive username filtering**: Multi-layered protection system with specific error messages
- **Improved spacing**: Better visual hierarchy and spacing in hero section and throughout UI