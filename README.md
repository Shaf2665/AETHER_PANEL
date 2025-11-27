# Aether Panel - Game Server Hosting Dashboard

A comprehensive game server hosting dashboard that integrates with Pterodactyl Panel, featuring a coin-based economy system for users to earn and spend coins on server resources.

**Repository**: [https://github.com/Shaf2665/AETHER_PANEL](https://github.com/Shaf2665/AETHER_PANEL)

## Features

- 🔐 **User Authentication** - Secure registration and login system
- 💰 **Coin System** - Earn coins through various methods
- 🎮 **Server Management** - Create and manage game servers (Minecraft, FiveM, etc.)
- 🔗 **Pterodactyl Integration** - Full API integration with Pterodactyl Panel
- 💵 **Revenue Generation** - Multiple ways for hosting owners to generate revenue:
  - Linkvertise integration
  - AFK page system
  - Survey completion
  - Ad viewing
  - Referral system
  - Daily login bonuses

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL
- Redis
- JWT Authentication

### Frontend
- React + TypeScript (ready for migration)
- Tailwind CSS
- React Query
- React Router

## Project Structure

```
aether-panel/
├── backend/          # Express API server
│   ├── src/
│   │   ├── config/   # Configuration files
│   │   ├── models/    # Database models
│   │   ├── routes/    # API routes
│   │   ├── services/  # Business logic
│   │   └── middleware/
│   └── package.json
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── contexts/
│   └── package.json
├── docker-compose.yml # Docker Compose configuration
├── Dockerfile         # Docker image definition
├── DOCKER.md          # Detailed Docker documentation
└── README.md
```

## Installation

Aether Panel is designed to run in Docker containers. This is the recommended and primary installation method.

### Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Pterodactyl Panel (with API keys)

### Quick Start with Docker

1. **Clone the repository:**
```bash
git clone https://github.com/Shaf2665/AETHER_PANEL.git
cd AETHER_PANEL
```

2. **Create environment file:**
```bash
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000

# JWT Secret (REQUIRED - Generate a strong random secret)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Database Configuration
DB_NAME=aether_panel
DB_USER=postgres
DB_PASSWORD=your-secure-database-password

# Redis Configuration
REDIS_ENABLED=true
REDIS_PASSWORD=your-redis-password

# Pterodactyl Panel Configuration
PTERODACTYL_URL=https://your-panel-url.com
PTERODACTYL_API_KEY=your-pterodactyl-api-key
PTERODACTYL_CLIENT_API_KEY=your-pterodactyl-client-api-key
PTERODACTYL_APPLICATION_API_KEY=your-pterodactyl-application-api-key

# Revenue System Configuration
LINKVERTISE_ENABLED=true
AFK_ENABLED=true
SURVEYS_ENABLED=true
ADS_ENABLED=true
REFERRAL_ENABLED=true
DAILY_LOGIN_ENABLED=true
EOF
```

3. **Edit the `.env` file** with your actual configuration values.

4. **Start all services:**
```bash
docker-compose up -d
```

5. **Run database migrations:**
```bash
docker-compose exec aether-panel npm run migrate
```

6. **Access the application:**
- **Application**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

### Docker Commands

```bash
# View logs
docker-compose logs -f aether-panel

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Access container shell
docker-compose exec aether-panel sh

# Restart services
docker-compose restart
```

### Manual Docker Build (Alternative)

If you prefer to build manually without docker-compose:

```bash
# Build the image
docker build -t aether-panel:latest .

# Run with external PostgreSQL and Redis
docker run -d \
  --name aether-panel \
  -p 5000:5000 \
  --env-file .env \
  --network your-network \
  aether-panel:latest
```

**Note**: When running manually, ensure PostgreSQL and Redis are accessible and configured in your `.env` file.

For detailed Docker setup instructions, troubleshooting, and advanced configuration, see [DOCKER.md](DOCKER.md).

## Configuration

All configuration is done through environment variables in the `.env` file. See [DOCKER.md](DOCKER.md) for a complete list of configuration options.

### Required Configuration

1. **JWT Secret**: Generate a strong random secret (minimum 32 characters)
   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   ```

2. **Pterodactyl Panel**: 
   - Generate API keys in your Pterodactyl Panel
   - Add them to your `.env` file

3. **Database**: Configure PostgreSQL connection in `.env`

### Optional Configuration

- **Redis**: Configure for session management and caching
- **Revenue Systems**: Enable/disable and configure coin rewards
- **Port**: Change default port (5000) if needed

See [DOCKER.md](DOCKER.md) for detailed configuration options.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Coins
- `GET /api/coins/balance` - Get coin balance
- `GET /api/coins/transactions` - Get transaction history

### Servers
- `GET /api/servers` - Get user's servers
- `POST /api/servers/create` - Create new server
- `GET /api/servers/:id` - Get server details
- `PUT /api/servers/:id/resources` - Update server resources
- `DELETE /api/servers/:id` - Delete server

### Revenue
- `GET /api/revenue/tasks` - Get available revenue tasks
- `POST /api/revenue/linkvertise/generate` - Generate Linkvertise link
- `POST /api/revenue/linkvertise/complete` - Complete Linkvertise task
- `POST /api/revenue/afk/start` - Start AFK session
- `POST /api/revenue/afk/complete` - Complete AFK session
- `GET /api/revenue/afk/status` - Get AFK session status

### Resources
- `GET /api/resources/pricing` - Get resource pricing
- `POST /api/resources/purchase` - Purchase resources

## Database Schema

The database includes tables for:
- Users (authentication, coin balances)
- Servers (game server instances)
- Transactions (coin transactions)
- Revenue Tasks (earning opportunities)
- Resource Purchases (resource allocation history)

See `backend/src/database/schema.sql` for the complete schema.

## Development

For development purposes, you can run the application locally without Docker. However, Docker is still recommended for consistency.

### Local Development Setup

**Prerequisites:**
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Redis (optional)

**Backend:**
```bash
cd backend
npm install
cp .env.example .env  # Configure your .env file
npm run migrate
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
npm start
```

**Note**: For production deployments, always use Docker as described in the Installation section above.

## Security Considerations

- All API routes (except auth) require JWT authentication
- Passwords are hashed using bcrypt
- Rate limiting is enabled on all API routes
- CORS is configured for frontend origin
- Helmet.js is used for security headers

## Future Enhancements

- [ ] Complete server creation flow with Pterodactyl
- [ ] Resource purchase implementation
- [ ] Survey integration (Pollfish, TapResearch)
- [ ] Ad viewing system
- [ ] Referral tracking system
- [ ] Daily login bonus automation
- [ ] Server console access
- [ ] File manager integration
- [ ] Server statistics and monitoring
- [ ] Email notifications
- [ ] Two-factor authentication

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

