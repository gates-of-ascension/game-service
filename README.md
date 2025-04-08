# Gates of Ascension - Game Service

Backend API service for the Gates of Ascension card game. This service handles user authentication, card management, deck building, lobby creation, and real-time gameplay via WebSockets.

## 🚀 Features (in progress)

- User authentication and session management
- Card collection and deck building 
- Lobby creation and management
- Real-time gameplay via WebSocket connections 
- Redis for session storage and real-time game state
- PostgreSQL for persistent data storage

## 📋 Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- PostgreSQL
- Redis

## 🔧 Environment Setup

1. Clone the repository:
   ```
   git clone https://github.com/gates-of-ascension/game-service.git
   cd game-service
   ```

2. Copy the environment template and configure your variables:
   ```
   cp .env.tpl .env
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the required services using Docker:
   ```
   docker-compose -p local-gates-of-ascension-backend up -d
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```
npm run dev
```

### Production Build
```
npm run build
npm start
```

### Testing
```
npm test
```

## 🏗️ Project Structure

- `src/` - Source code
  - `controllers/` - Business logic handlers
  - `middleware/` - Express middleware
  - `models/` - Database models (PostgreSQL and Redis)
  - `routes/` - API route definitions
  - `utils/` - Utility functions
  - `validation/` - Input validation schemas
  - `websockets/` - Socket.IO setup and channel handlers

## 📦 API Endpoints

- **Users API**
  - Authentication and user management

- **Cards API**
  - Card collection and information

- **User Decks API**
  - Deck creation and management

- **Lobbies API**
  - Game lobby management

## 🔌 WebSocket Channels

The application uses Socket.IO for real-time communication:

- Lobby management
- Game state updates
- Player actions

## 🛠️ Technologies

- TypeScript
- Express.js
- Socket.IO
- Sequelize ORM
- Redis
- PostgreSQL
- Jest (testing)

## 📄 License

ISC