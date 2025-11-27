# Docker Setup Guide for Aether Panel

This guide explains how to build and run Aether Panel using Docker in a single container setup.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Basic knowledge of Docker commands

## Quick Start

### 1. Clone and Navigate

```bash
cd aether-panel
```

### 2. Create Environment File

Create a `.env` file in the root directory with your configuration. You can use this template:

```bash
# Create .env file
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database Configuration
DB_NAME=aether_panel
DB_USER=postgres
DB_PASSWORD=your-database-password

# Redis Configuration (optional)
REDIS_ENABLED=true
REDIS_PASSWORD=

# Pterodactyl Panel Configuration
PTERODACTYL_URL=https://panel.example.com
PTERODACTYL_API_KEY=your-pterodactyl-api-key
PTERODACTYL_CLIENT_API_KEY=your-pterodactyl-client-api-key
PTERODACTYL_APPLICATION_API_KEY=your-pterodactyl-application-api-key

# Revenue System Configuration (see DOCKER.md for all options)
LINKVERTISE_ENABLED=true
AFK_ENABLED=true
SURVEYS_ENABLED=true
ADS_ENABLED=true
REFERRAL_ENABLED=true
DAILY_LOGIN_ENABLED=true
EOF
```

Edit `.env` and configure:
- Database credentials
- JWT secret (use a strong random string)
- Pterodactyl API keys
- Revenue system settings

### 3. Build and Run with Docker Compose

```bash
docker-compose up -d
```

This will:
- Build the Aether Panel container
- Start PostgreSQL database
- Start Redis cache
- Start the Aether Panel application

### 4. Run Database Migrations

```bash
docker-compose exec aether-panel npm run migrate
```

### 5. Access the Application

Open your browser and navigate to:
- **Application**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

## Manual Docker Build

If you prefer to build and run manually without docker-compose:

### Build the Image

```bash
docker build -t aether-panel:latest .
```

### Run the Container

```bash
docker run -d \
  --name aether-panel \
  -p 5000:5000 \
  --env-file .env \
  --network aether-network \
  aether-panel:latest
```

**Note**: You'll need to set up PostgreSQL and Redis separately when running manually.

## Docker Compose Configuration

### Services

- **aether-panel**: Main application container (backend + frontend)
- **postgres**: PostgreSQL database
- **redis**: Redis cache for sessions

### Environment Variables

All environment variables can be set in:
1. `.env` file in the root directory
2. `docker-compose.yml` environment section
3. Command line using `-e` flag

### Port Configuration

Default port is `5000`. To change it, set `PANEL_PORT` in your `.env`:

```env
PANEL_PORT=8080
```

### Volumes

- `postgres_data`: Persistent storage for PostgreSQL
- `redis_data`: Persistent storage for Redis

## Development with Docker

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f aether-panel
```

### Execute Commands in Container

```bash
# Run migrations
docker-compose exec aether-panel npm run migrate

# Access shell
docker-compose exec aether-panel sh

# Check database connection
docker-compose exec aether-panel node -e "require('./src/config/database')"
```

### Rebuild After Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Rebuild without cache
docker-compose build --no-cache
```

## Production Deployment

### Security Considerations

1. **Change Default Passwords**: Update all default passwords in `.env`
2. **Use Strong JWT Secret**: Generate a secure random string for `JWT_SECRET`
3. **Enable HTTPS**: Use a reverse proxy (nginx/traefik) with SSL certificates
4. **Restrict Network Access**: Only expose necessary ports
5. **Regular Updates**: Keep Docker images and dependencies updated

### Reverse Proxy Setup (Nginx Example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment Variables for Production

Ensure these are set in production:

```env
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
DB_PASSWORD=<strong-database-password>
REDIS_PASSWORD=<strong-redis-password>
```

## Troubleshooting

### Container Won't Start

1. Check logs: `docker-compose logs aether-panel`
2. Verify environment variables are set correctly
3. Ensure ports are not already in use
4. Check database connectivity

### Database Connection Issues

1. Verify PostgreSQL is running: `docker-compose ps postgres`
2. Check database credentials in `.env`
3. Ensure database exists: `docker-compose exec postgres psql -U postgres -l`

### Frontend Not Loading

1. Verify build completed successfully: `docker-compose logs aether-panel | grep build`
2. Check that static files are being served
3. Verify API routes are working: `curl http://localhost:5000/api/health`

### Performance Issues

1. Check container resources: `docker stats`
2. Monitor database performance
3. Review application logs for errors
4. Consider increasing container memory limits

## Health Checks

The container includes health checks:

- **Application**: `http://localhost:5000/health`
- **PostgreSQL**: Automatic via docker-compose
- **Redis**: Automatic via docker-compose

Check health status:

```bash
docker-compose ps
```

## Backup and Restore

### Backup Database

```bash
docker-compose exec postgres pg_dump -U postgres aether_panel > backup.sql
```

### Restore Database

```bash
docker-compose exec -T postgres psql -U postgres aether_panel < backup.sql
```

### Backup Redis

```bash
docker-compose exec redis redis-cli --rdb /data/dump.rdb
```

## Updating the Application

1. Pull latest code
2. Rebuild container: `docker-compose up -d --build`
3. Run migrations if needed: `docker-compose exec aether-panel npm run migrate`
4. Restart services: `docker-compose restart`

## Cleanup

### Stop All Services

```bash
docker-compose down
```

### Remove All Data (WARNING: Deletes all data)

```bash
docker-compose down -v
```

### Remove Images

```bash
docker rmi aether-panel:latest
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)

