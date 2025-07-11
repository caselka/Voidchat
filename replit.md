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

## Recent Updates (July 11, 2025)

### Message Alignment and Input Area Improvements (Latest)
- **Fixed message alignment**: User messages now properly align to the right, other users' messages to the left
- **Header overlap fixed**: Added proper main-content wrapper with header offset to prevent title overlap
- **Clean input area design**: Removed outer containers and added subtle blur effect for full-screen usage
- **Enhanced touch interactions**: Improved Discord-style input with better focus states and mobile optimization
- **Proper message flow**: Own messages in right alignment with reversed avatar position, others on left with standard layout
- **Compact message handling**: Fixed compact mode for consecutive messages with proper left/right padding
- **Better visual hierarchy**: Clear distinction between user messages and others with improved spacing and alignment

### Landing Page Mobile Layout Optimization
- **Enhanced mobile responsiveness**: Improved mobile-first design with better spacing, typography, and button sizing
- **Touch-friendly interactions**: Full-width buttons on mobile, proper touch targets (44px minimum)
- **Responsive typography**: Scaled font sizes from mobile (text-4xl) to desktop (text-8xl) for optimal readability
- **Improved spacing consistency**: Unified padding and margins across all sections for better visual hierarchy
- **Mobile-optimized footer**: Responsive grid layout with proper mobile spacing and touch-friendly links
- **Better CTA section**: Enhanced call-to-action buttons with full-width mobile layout and proper responsive sizing
- **Consistent mobile patterns**: Unified responsive design patterns across hero, features, pricing, and footer sections

### Discord-Style Chat Interface Implementation
- **Complete Discord-style layout**: Implemented Discord-inspired message layout with avatars, usernames, and timestamps
- **Message compacting system**: Consecutive messages from same user within 5 minutes show in compact mode (no avatar/header)
- **Avatar generation**: Auto-generated avatars with user initials, colored backgrounds for visual distinction
- **Enhanced hover interactions**: Message hover effects with floating moderation controls for guardians
- **Discord color scheme**: Updated theme colors to match Discord's light (#ffffff) and dark (#36393f) backgrounds
- **Improved typography**: Discord-style username styling, timestamp formatting, and message spacing
- **Professional input styling**: Discord-inspired message input with "Message #voidchat" placeholder and blue focus states
- **Better mobile optimization**: Touch-friendly message layout with proper spacing for mobile devices
- **Hardware-accelerated animations**: Smooth message transitions with proper CSS transforms for mobile performance

### Mobile-First CSS Layout Overhaul
- **Complete flexbox layout system**: Implemented 100dvh mobile-first layout with proper header, messages area, and sticky input sections
- **iOS keyboard compatibility**: Enhanced env(safe-area-inset-bottom) support and keyboard-inset-height handling for iOS devices
- **Rem-based typography**: Standardized 16px base font size using rem units throughout the app for consistent scaling
- **Improved message spacing**: Better visual rhythm with 1rem message bubble spacing and enhanced padding for readability
- **Smooth message animations**: Enhanced fade-in/fade-out animations using cubic-bezier curves for professional mobile experience
- **Touch-friendly interfaces**: 44px minimum touch targets and optimized button sizing for mobile accessibility
- **Auto-scroll optimization**: Fixed auto-scroll behavior to work with new flexbox layout and messages container
- **Enhanced responsive design**: Better mobile typography, status button spacing, and landscape orientation support
- **Hardware acceleration**: Added transform3d and will-change properties for smooth scrolling and animations on mobile devices

## Previous Updates (July 9, 2025)

### Comprehensive Mobile Optimization for All Pages (Latest)
- **Complete mobile-first redesign**: All dashboard pages, messaging interfaces, and moderation tools now fully optimized for mobile devices
- **Backend dashboard mobile optimization**: Touch-friendly interface with collapsible stat cards, horizontal scrolling tabs, and mobile-specific navigation
- **Moderator dashboard mobile enhancement**: Compact layout with mobile-optimized room management and message moderation features
- **Enhanced mobile CSS framework**: Added 50+ mobile-specific CSS classes for consistent responsive behavior across all components
- **Touch-friendly interactions**: Improved button sizes (min 44px), enhanced touch targets, and better spacing for mobile interfaces
- **Mobile form optimizations**: iOS-safe font sizes (16px) to prevent zoom, improved input padding, and better touch accessibility
- **Responsive grid layouts**: Mobile-first 2-column stat grids that expand to 4-column on desktop for better data presentation
- **Mobile navigation enhancements**: Horizontal scrolling tab bars, collapsible sidebars, and improved header designs for small screens
- **Performance optimizations**: Hardware acceleration, touch scrolling improvements, and better mobile viewport handling
- **Consistent mobile patterns**: Unified mobile spacing, typography, and interaction patterns across all pages for better user experience

### Complete Direct Messages System and Landing Page Overhaul
- **Direct messaging system completed**: Full implementation with database schema, API endpoints, and comprehensive UI
- **Direct messages UI integration**: Added Mail icon button in header for authenticated users to access /messages page
- **Landing page completely overhauled**: Removed theme customization references, updated with current features and pricing
- **Modern marketing copy**: Professional SEO-optimized content focusing on actual capabilities (anonymous chat, direct messaging, rooms, Guardian system)
- **Accurate pricing display**: Clear $3 accounts, $49 room creation, $20/day Guardian pricing with feature breakdowns
- **Enhanced security messaging**: Privacy-first principles, no tracking, 15-minute message expiration clearly communicated
- **Streamlined feature presentation**: Core features (ephemeral messages, anonymous access, room system, direct messages) prominently displayed
- **Professional footer**: Updated company links, legal pages, and contact information

### Critical Logout Redirect Fix
- **Fixed logout 404 error**: Resolved method mismatch between client POST and server GET endpoint
- **Enhanced session clearing**: Added proper cookie clearing and cache headers to prevent session persistence
- **Improved redirect handling**: Used low-level response headers to ensure proper redirect to landing page
- **Universal logout functionality**: All user types (super users, regular users, anonymous) now properly redirect to landing page after logout
- **Client-side optimization**: Changed logout calls from fetch() to direct window.location.href for better reliability

### Enhanced Room System with Advanced Moderation Features
- **Room categories, tags, and privacy settings**: Rooms now support descriptions, private/public settings, user limits, and custom rules
- **Advanced moderation tools**: Mute users with custom durations, ban users from rooms, set slow mode with configurable delays
- **Comprehensive moderator dashboard**: Three-tab interface for room management, message moderation, and settings configuration
- **Room statistics tracking**: Real-time stats showing message counts, active users, and moderator counts
- **Enhanced storage methods**: Database support for banned users, room settings, moderator management, and statistics
- **Quick action buttons**: One-click slow mode settings, customizable mute durations, and ban functionality
- **Room settings management**: Configure slow mode, set mute durations, and access detailed room analytics
- **Database schema updates**: Added room features including privacy, user limits, rules, and moderation tracking

### Permanent Message Storage Implementation
- **Removed message expiration system**: Messages are now stored permanently in the backend instead of the previous 15-minute TTL
- **Updated database schema**: Removed `expires_at` column from messages table to reflect permanent storage
- **Fixed cleanup processes**: Removed expired message deletion from scheduled cleanup jobs
- **Enhanced data persistence**: All chat messages now persist permanently for better user experience and data accuracy
- **Updated storage interface**: Modified message retrieval to work with permanent storage, maintaining backward compatibility

### Enhanced Backend Dashboard with User Preferences and Sponsor Management (Latest)
- **Date format customization**: Users can choose between relative (2h ago), short (Jan 9, 2:30 PM), or full format display
- **Comprehensive user menu**: Theme toggle, chats navigation, and logout functionality integrated into dashboard header
- **Clickable expandable stat containers**: Total users, messages, sponsors, and rooms cards expand to show detailed analytics
- **Manual sponsor approval workflow**: Clear notification system informing sponsors their ads require approval before going live
- **Enhanced sponsor purchase notifications**: Console alerts and detailed messaging when new sponsor purchases are made
- **Real-time expandable tabs**: Six main sections (Sponsors, Users, Messages, Rooms, Reports, System) with detailed views
- **Complete sponsor analytics tracking**: 1 cent per impression, 5 cents per click with budget-based distribution fairness
- **Professional approval interface**: Clear approve/reject buttons with status tracking and payment information display

### Backend Dashboard System Complete
- **Comprehensive backend dashboard**: Full moderation interface at /backend for super users (voidteam/caselka)
- **Real-time system statistics**: Live data from database showing user counts, message activity, sponsor metrics, and room statistics
- **Sponsor management**: Complete sponsor ad approval/rejection system with database integration
- **User management interface**: Real-time user listing with role management, verification status, and account details
- **Guardian action tracking**: Moderation history with detailed logs of all guardian activities
- **System health monitoring**: Live alerts based on actual system performance and usage metrics
- **Role-based landing pages**: Super users redirect to /backend dashboard, regular users to /chat after login
- **Moderator dashboard**: Complete room management interface at /moderator for all authenticated users
- **Fixed Database icon import**: Resolved "Database is not defined" error in backend dashboard
- **Database-driven insights**: All dashboard data comes from live database queries, no mock data
- **Accurate user statistics**: 6 total users, 3 verified, 5 active rooms, 4 sponsor ads currently running

### VLoading Component Removal and UI Cleanup (Latest)
- **VLoading component removed**: Replaced all broken VLoading components with Lucide React Loader2 icons
- **Human verification disabled**: Completely removed verification requirement for anonymous users
- **Fixed app routing**: Corrected App.tsx to use main chat.tsx file instead of chat-new.tsx
- **Stable loading indicators**: All loading states now use consistent Loader2 spinner with proper animations
- **Create room page fixed**: Removed problematic VLoading from create-room and register pages
- **UI consistency**: All forms now use standard spinning icons for loading states

### WebSocket Authentication and User Identification Fix (Latest)
- **Fixed WebSocket authentication**: Resolved session parsing issue where 's:' prefix in cookies wasn't properly stripped
- **Authenticated user display**: Messages now correctly show registered username "rob" instead of anonymous "anon2186"
- **Session matching logic**: Fixed session ID comparison between cookie storage and database lookup
- **Real-time user identification**: WebSocket connection now properly detects authenticated users on connect
- **Message username consistency**: Both message sending and client status display now use correct authenticated username
- **Comprehensive debugging**: Added detailed session parsing and authentication flow logging for troubleshooting
- **Fallback system maintained**: Anonymous users still get proper anon usernames when not logged in

### Account Settings and Message Persistence Fix
- **Fixed account settings access**: Added Users icon in header when logged in to access member settings
- **Corrected user display logic**: Landing page now shows actual username instead of email prefix (fixed "caselka" vs "rob" issue)
- **Enhanced message persistence**: Messages now load from database before WebSocket connection to prevent loss on refresh
- **Verified message storage**: Database is properly storing and retrieving messages with 15-minute expiration
- **Improved WebSocket reconnection**: Better error handling and connection stability
- **Fixed all navigation icons**: Replaced missing Cube icon with Box icon throughout app
- **Mobile optimizations maintained**: Viewport settings and responsive design preserved

### Input Positioning Fix and UI Finalization
- **Fixed input movement**: Input now stays locked in place during auto-scroll after sending messages
- **Stable positioning**: Using translate3d(0,0,0) and will-change:transform for hardware acceleration
- **Window scroll method**: Auto-scroll uses window.scrollTo instead of container scroll to prevent input movement
- **Complete CSS variable theming**: Clean --bg, --text, --bubble, --input-bg, --input-text variables
- **Light/dark mode styling**: Proper contrast and readability in both themes
- **Mobile-first design**: 14px font, compact spacing, 90% max-width, fixed bottom input
- **Performance optimized**: Hardware acceleration, clean CSS, minimal dependencies
- **Ghost message filtering**: Only render messages with valid content (non-null, non-empty text)

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
- **Human verification**: DISABLED - removed math captcha requirement for anonymous users
- **Individual room pages**: Each room has dedicated page at /room/name with owner information
- **Rooms button in header**: Purple message square icon button on left side for all users to access room features
- **Rooms sidebar functionality**: Click rooms button to expand sidebar from left showing all available rooms

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