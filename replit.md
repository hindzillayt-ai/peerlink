# PEERLINK - Anonymous College Chat App

## Overview

PEERLINK is a real-time, anonymous chat application designed exclusively for college students. The application provides a safe, private space for communication without requiring any sign-up, login, or registration. Students can engage in real-time conversations across multiple topic-based channels using Socket.IO for instant messaging. The application features a "Neon Noir" design theme with dark backgrounds and vibrant neon accents (electric purple, cyan, and magenta).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Single Page Application (SPA) Pattern**
- Pure vanilla JavaScript implementation without frontend frameworks
- Class-based architecture with `PeerLinkApp` as the main controller
- Event-driven UI updates for real-time interactions
- Client-side state management for user sessions, chat history, and UI preferences

**Rationale**: Chosen for simplicity and minimal dependencies, making the application lightweight and easy to maintain. Avoids framework overhead for a relatively simple chat interface.

**Anonymous Identity System**
- Client-generated anonymous IDs using random adjective-noun combinations
- Session-based storage of user data (no persistent authentication)
- Color-coded user avatars for visual identification
- Optional real name storage in session storage from login flow

**Rationale**: Provides complete anonymity while maintaining user identity within a session, addressing privacy concerns of college students.

**Real-Time Communication**
- Socket.IO client for bidirectional event-based communication
- Typing indicators with debounced events
- Channel-based message routing
- Online user presence tracking

**Rationale**: Socket.IO chosen for its reliability, automatic fallback mechanisms, and built-in event handling that simplifies real-time features.

### Backend Architecture

**Express.js HTTP Server**
- Minimal REST API surface (primarily for file uploads)
- Static file serving for frontend assets
- CORS-enabled for flexible deployment options

**Rationale**: Express provides a lightweight, unopinionated framework suitable for serving the SPA and handling file uploads without unnecessary complexity.

**Socket.IO WebSocket Server**
- Event-based message broadcasting
- Channel/room-based message distribution
- Connection state management
- Maximum buffer size: 10MB for media uploads

**Rationale**: Socket.IO server complements the client, providing reliable real-time communication with automatic reconnection and room management.

**File Upload System**
- Multer middleware for multipart form data handling
- Disk-based storage in local `uploads/` directory
- Whitelist-based file validation (images, videos, documents)
- Unique filename generation using timestamps and random suffixes

**Rationale**: Local file storage chosen for development simplicity. Production deployments would require migration to cloud storage (S3, Cloudinary, etc.).

**Supported File Types**:
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, WebM
- Documents: PDF, DOC, DOCX, TXT

### Data Storage

**Client-Side Storage Only**
- Session Storage: Login data, user preferences
- Local Storage: Chat history, settings
- No server-side database implementation

**Rationale**: Aligns with the anonymous, no-registration design philosophy. Messages are ephemeral and not persisted server-side, ensuring privacy.

**Limitations**: 
- Chat history lost on page refresh/browser close
- No message persistence across devices
- Scalability limited by in-memory state

**Future Consideration**: Could migrate to Redis for server-side session/message caching while maintaining anonymity.

### Channel Architecture

**Predefined Channel System**
- Five topic-based channels: `general-chat`, `exam-prep`, `campus-events`, `mental-health-support`, `buy-and-sell`
- Channel switching without page reload
- Per-channel message isolation
- Active channel state maintained client-side

**Rationale**: Fixed channel structure simplifies UI/UX and content moderation. Prevents channel sprawl while covering main student use cases.

## External Dependencies

### Core Runtime Dependencies

**express** (^4.18.2)
- HTTP server framework
- Static file serving
- Middleware support for CORS and file uploads

**socket.io** (^4.7.2)
- WebSocket server implementation
- Real-time bidirectional event-based communication
- Automatic reconnection and fallback mechanisms

**cors** (^2.8.5)
- Cross-Origin Resource Sharing middleware
- Enables flexible deployment across different domains

**multer** (^2.0.2)
- Multipart/form-data parsing for file uploads
- Disk storage engine for uploaded files
- File filtering and validation

### Development Dependencies

**nodemon** (^3.0.1)
- Development server with automatic restart on file changes
- Used via `npm run dev` script

### Frontend CDN Dependencies

**Google Fonts - Poppins**
- Typography for consistent branding
- Weights: 300, 400, 500, 600, 700

**Font Awesome** (6.0.0)
- Icon library for UI elements
- Channel indicators, user status, media types

### Deployment Considerations

**Node.js Version Requirement**: >=14.0.0 (specified in package.json)

**Missing Production Infrastructure**:
- No database (PostgreSQL, MongoDB, etc.)
- No cloud file storage (S3, Cloudinary)
- No authentication service
- No environment configuration management
- No containerization (Docker)
- No reverse proxy configuration (Nginx)

**Potential Production Additions**:
- Database for message persistence and analytics
- Redis for session management and rate limiting
- Cloud storage for uploaded files
- Message queue for scaling (RabbitMQ, Kafka)
- Monitoring and logging (Winston, Sentry)