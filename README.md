# Aether Dashboard - Game Server Hosting Dashboard

A comprehensive game server hosting dashboard that integrates with Pterodactyl Panel, featuring a coin-based economy system for users to earn and spend coins on server resources.

**Repository**: [https://github.com/Shaf2665/AETHER_DASHBOARD](https://github.com/Shaf2665/AETHER_DASHBOARD)

## Features

- 🔐 **User Authentication** - Secure registration and login system with Discord OAuth support
- 👑 **Admin Panel** - Comprehensive admin dashboard with role-based access control
  - User management (view, edit, delete, search, filter)
  - Server management across all users
  - Transaction history and monitoring
  - Revenue analytics and statistics
  - Coin adjustment tools
- 💰 **Coin System** - Earn coins through various methods
- 🎮 **Server Management** - Create and manage game servers (Minecraft, FiveM, etc.)
  - Real-time cost calculation
  - Resource upgrades
  - Server creation with Pterodactyl integration
- 🔗 **Pterodactyl Integration** - Full API integration with Pterodactyl Panel
- 💵 **Revenue Generation** - Multiple ways for hosting owners to generate revenue:
  - Linkvertise integration (with manual mode support)
  - AFK page system
  - Survey completion
  - Ad viewing
  - Referral system
  - Daily login bonuses
- 🌐 **Subdomain Support** - Easy subdomain setup with Cloudflare DNS configuration
- 🎨 **Modern UI** - Beautiful, responsive interface with glassmorphism effects, gradients, and animations
- ⚙️ **Easy Setup** - Interactive setup wizard with automatic prerequisite installation

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
aether-dashboard/
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

Aether Dashboard is designed to run in Docker containers. This is the recommended and primary installation method.

### Prerequisites

- **Git** - Required to clone the repository
- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Pterodactyl Panel (with API keys)

#### Installing Git

If Git is not installed on your system, install it using one of the following methods:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install git -y
```

**CentOS/RHEL/Fedora:**
```bash
sudo yum install git -y
# or for newer versions
sudo dnf install git -y
```

**Arch Linux:**
```bash
sudo pacman -S git
```

**macOS:**
```bash
# Using Homebrew
brew install git

# Or download from: https://git-scm.com/download/mac
```

**Windows:**
Download and install from: https://git-scm.com/download/win

After installation, verify Git is installed:
```bash
git --version
```

### 🚀 Quick Start (Recommended)

The easiest way to install Aether Dashboard is using our interactive setup wizard:

```bash
git clone https://github.com/Shaf2665/AETHER_DASHBOARD.git
cd AETHER_DASHBOARD
chmod +x setup.sh
./setup.sh
```

The setup wizard will:
- ✅ Check all prerequisites (Docker, Docker Compose)
- ✅ Automatically install missing prerequisites if needed (Docker and Docker Compose)
- ⚠️ **Note**: Git must be installed manually before running the setup script (see Prerequisites above)
- ✅ Auto-detect your VPS IP address
- ✅ Guide you through configuration step-by-step
- ✅ Support subdomain setup with Cloudflare DNS instructions
- ✅ Configure admin email for automatic admin role assignment
- ✅ Auto-generate secure JWT secret
- ✅ Create `.env` file automatically
- ✅ Build and start all services
- ✅ Run database migrations
- ✅ Configure firewall rules
- ✅ Configure nginx reverse proxy (optional)
- ✅ Automatically obtain SSL certificates with Let's Encrypt (if chosen)
- ✅ Verify installation

**That's it!** Just answer a few questions and you're ready to go.

### Post-Installation Steps

After the setup script completes, you may need to complete a few manual steps depending on your configuration:

#### If Using Cloudflare (Subdomain Setup)

1. **Verify DNS Configuration**: Ensure your DNS A record is configured in Cloudflare:
   - Record Type: A
   - Name: `dashboard` (or your subdomain)
   - Content: Your VPS IP address
   - Proxy: **Proxied** (orange cloud) - **Required for HTTPS**

2. **Configure Cloudflare SSL/TLS Mode** (Critical):
   - Go to Cloudflare Dashboard → Your Domain → **SSL/TLS**
   - Set **Encryption mode** to **"Flexible"** (NOT "Full" or "Full (strict)")
   - This is required because your origin server runs on HTTP
   - Wait 1-2 minutes for changes to propagate
   - **Without this setting, you'll see SSL certificate errors** (NET::ERR_CERT_COMMON_NAME_INVALID)

3. **Verify Access**: Try accessing your dashboard at `https://dashboard.yourdomain.com`
   - If you see SSL certificate errors, check that Cloudflare SSL/TLS mode is set to "Flexible"
   - DNS propagation may take a few minutes to 24 hours

#### If Using Let's Encrypt

1. **SSL Certificate**: The script will automatically obtain SSL certificates using certbot
   - If certbot fails or you skipped it during setup, you can run it manually:
     ```bash
     sudo apt install certbot python3-certbot-nginx -y
     sudo certbot --nginx -d dashboard.yourdomain.com
     ```
   - Certbot will automatically update your nginx configuration

2. **Verify HTTPS**: Access your dashboard at `https://dashboard.yourdomain.com`
   - The SSL certificate should be valid and trusted

#### Troubleshooting

- **Dashboard not accessible via domain**: 
  - Check nginx is running: `sudo systemctl status nginx`
  - Check nginx configuration: `sudo nginx -t`
  - Verify DNS settings in Cloudflare
- **SSL certificate errors**: 
  - For Cloudflare: Ensure SSL/TLS mode is set to "Flexible" (not "Full")
  - For Let's Encrypt: Verify certbot ran successfully: `sudo certbot certificates`
- **Nginx errors**: 
  - Test configuration: `sudo nginx -t`
  - Check error logs: `sudo tail -f /var/log/nginx/error.log`

### Manual Installation (Alternative)

If you prefer to configure manually:

1. **Clone the repository:**
```bash
git clone https://github.com/Shaf2665/AETHER_DASHBOARD.git
cd AETHER_DASHBOARD
```

2. **Create environment file:**
```bash
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000

# Frontend URL (REQUIRED in production - your dashboard domain or subdomain)
FRONTEND_URL=https://your-dashboard-domain.com
# Or use subdomain: https://dashboard.yourdomain.com

# Admin Configuration
# Set the email address that should have admin access (Gmail or Discord email)
# Users registering or logging in with this email will automatically get admin role
ADMIN_EMAIL=your-admin-email@example.com

# JWT Secret (REQUIRED - Generate a strong random secret)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Database Configuration
DB_NAME=aether_dashboard
DB_USER=postgres
DB_PASSWORD=your-secure-database-password

# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Pterodactyl Panel Configuration
PTERODACTYL_URL=https://your-panel-url.com
PTERODACTYL_API_KEY=your-pterodactyl-api-key
PTERODACTYL_CLIENT_API_KEY=your-pterodactyl-client-api-key
PTERODACTYL_APPLICATION_API_KEY=your-pterodactyl-application-api-key
PTERODACTYL_NODE_ID=1
PTERODACTYL_NEST_ID=1
PTERODACTYL_EGG_ID=1
PTERODACTYL_DEFAULT_USER_ID=1

# Discord OAuth Configuration (Optional)
# When enabled, users can sign in with Discord
# Discord email will be stored and checked against ADMIN_EMAIL for admin role assignment
DISCORD_ENABLED=false
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://your-dashboard-domain.com/api/auth/discord/callback

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
docker-compose exec aether-dashboard npm run migrate
```

6. **Access the application:**
- **Application**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

### Docker Commands

```bash
# View logs
docker-compose logs -f aether-dashboard

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Access container shell
docker-compose exec aether-dashboard sh

# Restart services
docker-compose restart
```

### Manual Docker Build (Alternative)

If you prefer to build manually without docker-compose:

```bash
# Build the image
docker build -t aether-dashboard:latest .

# Run with external PostgreSQL and Redis
docker run -d \
  --name aether-dashboard \
  -p 5000:5000 \
  --env-file .env \
  --network your-network \
  aether-dashboard:latest
```

**Note**: When running manually, ensure PostgreSQL and Redis are accessible and configured in your `.env` file.

For detailed Docker setup instructions, troubleshooting, and advanced configuration, see [DOCKER.md](DOCKER.md).

## Configuration

All configuration is done through environment variables in the `.env` file. See [DOCKER.md](DOCKER.md) for a complete list of configuration options.

### Required Configuration

1. **Frontend URL** (Production only): Set your dashboard domain or subdomain
   ```bash
   FRONTEND_URL=https://your-dashboard-domain.com
   # Or use subdomain: https://dashboard.yourdomain.com
   ```
   - Required in production for CORS configuration
   - Can be omitted in development
   - Supports multiple origins (comma-separated)

2. **Admin Email** (Recommended): Set the email that should have admin access
   ```bash
   ADMIN_EMAIL=your-admin-email@example.com
   ```
   - Users registering or logging in with this email will automatically get admin role
   - Works with both regular registration and Discord OAuth
   - Can be your Gmail or Discord email address
   - If not set, you'll need to manually promote users to admin via database

3. **JWT Secret**: Generate a strong random secret (minimum 32 characters)
   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   ```

4. **Pterodactyl Panel**: 
   - Generate API keys in your Pterodactyl Panel
   - Add them to your `.env` file
   - Configure node/nest/egg IDs for server creation

5. **Database**: Configure PostgreSQL connection in `.env`

6. **Discord OAuth** (Optional): 
   - Create a Discord Application at https://discord.com/developers/applications
   - Get Client ID and Client Secret
   - Set Redirect URI to: `https://your-domain.com/api/auth/discord/callback`
   - Add to `.env`: `DISCORD_ENABLED=true`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
   - Discord email will be automatically checked against `ADMIN_EMAIL` for admin role assignment

### Optional Configuration

- **Redis**: Configure for session management and caching
- **Revenue Systems**: Enable/disable and configure coin rewards
- **Port**: Change default port (5000) if needed
- **Subdomain Setup**: Configure a subdomain (e.g., dashboard.yourdomain.com) with Cloudflare DNS

### Subdomain Configuration with Cloudflare

If you want to use a subdomain instead of an IP address:

1. **During Setup**: The setup wizard will prompt you if you want to use a subdomain
2. **DNS Configuration**: Follow the instructions to add an A record in Cloudflare:
   - Record Type: A
   - Name: `dashboard` (or your preferred subdomain)
   - Content: Your VPS IP address
   - Proxy: **Proxied** (orange cloud) - **Required for HTTPS support**
3. **Cloudflare SSL/TLS Configuration** (Critical):
   - Go to Cloudflare Dashboard → Your Domain → **SSL/TLS**
   - Set **Encryption mode** to **"Flexible"** (NOT "Full" or "Full (strict)")
   - This is required because your origin server runs on HTTP
   - Without this setting, you'll see SSL certificate errors (NET::ERR_CERT_COMMON_NAME_INVALID)
4. **HTTPS**: With Cloudflare proxy enabled and SSL/TLS mode set to "Flexible", HTTPS is automatically available
5. **Update FRONTEND_URL**: The setup script will automatically set `FRONTEND_URL=https://dashboard.yourdomain.com` in your `.env` file

### First Admin Setup

To create your first admin user:

1. **Set Admin Email**: Add `ADMIN_EMAIL=your-email@example.com` to your `.env` file
2. **Register or Login**: 
   - Register with that email address, OR
   - Login via Discord OAuth (if your Discord account uses that email)
3. **Automatic Assignment**: The user will automatically receive admin role
4. **Access Admin Panel**: Navigate to `/admin` in the dashboard

**Note**: If you don't set `ADMIN_EMAIL`, you'll need to manually update the database to promote a user to admin:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

See [DOCKER.md](DOCKER.md) for detailed configuration options.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (auto-assigns admin role if email matches ADMIN_EMAIL)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/discord` - Initiate Discord OAuth flow
- `GET /api/auth/discord/callback` - Discord OAuth callback (auto-assigns admin role if email matches ADMIN_EMAIL)

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

### Admin Panel (Admin Only)
- `GET /api/admin/stats` - Get system statistics (users, servers, coins, revenue)
- `GET /api/admin/users` - Get all users with pagination, search, and filters
- `GET /api/admin/users/:id` - Get user details with servers and transactions
- `PUT /api/admin/users/:id` - Update user (username, email, role, coins)
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/users/:id/coins` - Manually adjust user coins
- `GET /api/admin/servers` - Get all servers with pagination and filters
- `GET /api/admin/transactions` - Get all transactions with pagination and filters
- `GET /api/admin/revenue` - Get revenue analytics (by source, daily, top earners)

## Database Schema

The database includes tables for:
- **Users** - Authentication, coin balances, role-based access control (admin/user)
  - Supports both email/password and Discord OAuth authentication
  - Role field for admin/user distinction
  - Discord fields: discord_id, discord_username, discord_avatar
- **Servers** - Game server instances linked to Pterodactyl
- **Transactions** - Coin transaction history (earned, spent, refunded)
- **Revenue Tasks** - Earning opportunities and completion tracking
- **Resource Purchases** - Resource allocation history

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

- [ ] Survey integration (Pollfish, TapResearch)
- [ ] Ad viewing system implementation
- [ ] Referral tracking system automation
- [ ] Daily login bonus automation
- [ ] Server console access
- [ ] File manager integration
- [ ] Server statistics and monitoring
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] Multi-language support
- [ ] Advanced analytics and reporting
- [ ] API rate limiting per user
- [ ] Webhook support for external integrations

## License

MIT

## FAQ

Have questions? Check out our [Frequently Asked Questions (FAQ)](FAQ.md) for answers to common installation, configuration, and troubleshooting questions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

