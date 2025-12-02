# Frequently Asked Questions (FAQ)

## 1. System Requirements

### What are the minimum RAM, CPU, and disk space requirements?

**Minimum Requirements:**
- **RAM**: 2GB minimum (4GB+ recommended for production)
- **CPU**: 1 vCPU minimum (2+ vCPUs recommended)
- **Disk Space**: 10GB minimum (20GB+ recommended for database growth)
- **OS**: Any Linux distribution that supports Docker

### Which Linux distributions are supported?

The setup script supports and automatically detects:
- **Ubuntu/Debian** (primary support)
- **CentOS/RHEL/Fedora**
- **Arch Linux**
- Any Linux distribution with Docker support

The script will automatically install prerequisites based on your detected OS.

---

## 2. Access and Permissions

### Do I need root access or sudo privileges?

**Root/Sudo Access is Required For:**
- Installing Docker and Docker Compose
- Configuring firewall rules
- Running Docker commands (unless user is in docker group)

**Root/Sudo Access is NOT Required For:**
- Running the dashboard after installation
- Using the dashboard application

### What if I don't have sudo access?

If you don't have sudo access:
- You can manually install Docker and Docker Compose
- You can run Docker with user permissions (add user to docker group: `sudo usermod -aG docker $USER`)
- Firewall configuration will be skipped (you'll need to open ports manually)
- You may need to contact your system administrator for initial setup

---

## 3. Reverse Proxy and Web Server

### Do I need to configure nginx separately, or does the setup script handle it?

- **The setup script does NOT configure nginx automatically**
- You can configure nginx separately if needed
- Nginx is not required if using Cloudflare proxy

### If I use Cloudflare, do I still need nginx on my server?

**No, you do NOT need nginx if using Cloudflare with proxy enabled (orange cloud):**
- Cloudflare provides HTTPS automatically
- Set Cloudflare SSL/TLS mode to "Flexible" (HTTPS to Cloudflare, HTTP to origin)
- The dashboard runs on HTTP port 5000; Cloudflare handles HTTPS termination

### Can I use Apache or another reverse proxy instead of nginx?

**Yes, you can use:**
- Apache
- Caddy
- Traefik
- Any reverse proxy that supports HTTP proxying

**Configuration Requirements:**
- Configure your reverse proxy to proxy to `http://localhost:5000`
- Ensure your reverse proxy forwards `X-Forwarded-*` headers (trust proxy is already configured in the application)
- The dashboard itself runs on HTTP; the reverse proxy handles SSL termination

### How do I set up SSL/HTTPS if I'm not using Cloudflare?

**Options:**
1. **Nginx/Apache with Let's Encrypt (Certbot)**
   - Install nginx/apache and certbot
   - Configure reverse proxy to `http://localhost:5000`
   - Obtain SSL certificate: `certbot --nginx` or `certbot --apache`
   
2. **Caddy** (automatic HTTPS)
   - Caddy automatically obtains and renews SSL certificates
   - Simple configuration: `your-domain.com { reverse_proxy localhost:5000 }`

3. **Traefik** (with Let's Encrypt)
   - Configure Traefik to handle SSL and proxy to the dashboard

The dashboard itself runs on HTTP; the reverse proxy handles SSL termination.

---

## 4. Domain and DNS

### Can I use a domain provider other than Cloudflare (e.g., Namecheap, GoDaddy)?

**Yes, absolutely!** The dashboard works with any DNS provider:
- Namecheap
- GoDaddy
- Cloudflare
- Google Domains
- Any DNS provider

The setup script provides Cloudflare-specific instructions, but any DNS provider works. Just add an A record pointing to your VPS IP address.

### What if I want to use the main domain instead of a subdomain?

**You can use either:**
- Main domain: `yourdomain.com`
- Subdomain: `dashboard.yourdomain.com`

Simply set `FRONTEND_URL` in your `.env` file to match your chosen domain:
```bash
FRONTEND_URL=https://yourdomain.com
# or
FRONTEND_URL=https://dashboard.yourdomain.com
```

### Do I need to configure DNS before or after running the setup script?

**You can configure DNS before or after setup:**
- If using a domain, set `FRONTEND_URL` to match your DNS configuration
- For Cloudflare: Add an A record pointing to your VPS IP (proxied recommended)
- DNS propagation may take a few minutes to hours

---

## 5. Pterodactyl Panel

### Do I need Pterodactyl Panel installed and running before installing this dashboard?

**No, Pterodactyl Panel is NOT required during setup:**
- You can configure it later via the Admin Panel
- The setup script makes Pterodactyl configuration optional
- Pterodactyl is only required when you want to create servers

### Can I configure Pterodactyl later, or is it required during setup?

**Yes, you can configure Pterodactyl later:**
- During setup, you can skip Pterodactyl configuration
- After installation, go to Admin Panel → Settings tab
- Enter your Pterodactyl configuration there
- The dashboard will work without Pterodactyl, but server creation won't be available

### What are NODE_ID, NEST_ID, and EGG_ID, and where do I find them?

**How to Find Pterodactyl IDs:**

1. **NODE_ID**:
   - Go to Pterodactyl Admin Panel → Nodes
   - Click on your node
   - The ID is in the URL: `/admin/nodes/view/1` (1 is the NODE_ID)
   - Or check the node list table

2. **NEST_ID**:
   - Go to Pterodactyl Admin Panel → Nests
   - Click on a nest (e.g., "Minecraft")
   - The ID is in the URL: `/admin/nests/view/1` (1 is the NEST_ID)

3. **EGG_ID**:
   - Go to Pterodactyl Admin Panel → Nests
   - Click on a nest → Click on an egg (e.g., "Paper")
   - The ID is in the URL: `/admin/nests/view/1/eggs/view/1` (last number is the EGG_ID)

4. **DEFAULT_USER_ID**:
   - Go to Pterodactyl Admin Panel → Users
   - Click on a user
   - The ID is in the URL: `/admin/users/view/1` (1 is the USER_ID)
   - This is the user that will own created servers

---

## 6. Ports and Conflicts

### What if port 5000 is already in use?

**You have two options:**

1. **Change the port** (recommended):
   - The setup script allows you to specify a different port
   - Or edit `PORT` in your `.env` file after installation

2. **Stop the service using port 5000**:
   - Find what's using the port: `sudo lsof -i :5000` or `sudo netstat -tulpn | grep :5000`
   - Stop that service before installation

### Can I change the port after installation?

**Yes, you can change the port after installation:**

1. Edit `PORT` in your `.env` file:
   ```bash
   PORT=8080  # or any available port
   ```

2. Update `FRONTEND_URL` if using a domain:
   ```bash
   FRONTEND_URL=https://your-domain.com:8080
   ```

3. Restart services:
   ```bash
   docker-compose restart
   ```

4. Update firewall rules if needed:
   ```bash
   sudo ufw allow 8080/tcp
   ```

### Which ports need to be open in the firewall?

**Required Port:**
- **Port 5000** (or your chosen port) - Dashboard access

**Optional Ports (only if accessing externally):**
- **Port 5432** - PostgreSQL (NOT recommended - keep internal)
- **Port 6379** - Redis (NOT recommended - keep internal)

**Best Practice:**
- Only open port 5000 (or your dashboard port)
- Keep PostgreSQL and Redis in the Docker network (not exposed)
- All services communicate internally via Docker network

---

## 7. Database and Redis

### Can I use an existing PostgreSQL database instead of creating a new one?

**Yes, you can use an existing PostgreSQL instance:**

1. **Update `.env` file** with your database connection:
   ```bash
   DB_HOST=your-postgres-host
   DB_PORT=5432
   DB_NAME=aether_dashboard  # Create a new database for the dashboard
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   ```

2. **Create a new database** for the dashboard:
   ```sql
   CREATE DATABASE aether_dashboard;
   ```

3. **Remove the postgres service** from `docker-compose.yml` (optional, if using external DB)

4. **Run migrations**:
   ```bash
   docker-compose exec aether-dashboard npm run migrate
   ```

### Can I use an existing Redis instance?

**Yes, you can use an existing Redis instance:**

1. **Update `.env` file**:
   ```bash
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password  # if set
   ```

2. **Remove the redis service** from `docker-compose.yml` (optional, if using external Redis)

3. **Restart services**:
   ```bash
   docker-compose restart
   ```

### What if I don't want to use Redis?

**Redis is optional but recommended:**
- Set `REDIS_ENABLED=false` in your `.env` file
- Some features may be limited (OAuth state management, caching)
- The application will work without Redis, but some functionality may be reduced

---

## 8. After Installation

### How do I access the dashboard after installation completes?

**Access Methods:**

1. **Local Access**:
   ```
   http://localhost:5000
   ```

2. **External Access (VPS IP)**:
   ```
   http://YOUR_VPS_IP:5000
   ```

3. **Domain Access** (if configured):
   ```
   https://your-domain.com
   ```

4. **Health Check**:
   ```
   http://localhost:5000/health
   ```

### What's the default login if I don't set ADMIN_EMAIL?

**There is NO default login:**
- You must register a new account
- If `ADMIN_EMAIL` is set, register/login with that email to get admin role automatically
- If `ADMIN_EMAIL` is not set, the first user will be a regular user

**To get admin access without ADMIN_EMAIL:**
1. Register any account
2. Connect to database: `docker-compose exec postgres psql -U postgres -d aether_dashboard`
3. Promote user: `UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';`

### How do I reset the admin password if I lose it?

**Option 1: If you have admin access:**
- Use Admin Panel → Users → Edit user → Change password

**Option 2: If you lost admin access:**

1. **Connect to database**:
   ```bash
   docker-compose exec postgres psql -U postgres -d aether_dashboard
   ```

2. **Generate new password hash** (in Node.js):
   ```javascript
   const bcrypt = require('bcryptjs');
   bcrypt.hash('new-password', 10).then(hash => console.log(hash));
   ```

3. **Update password**:
   ```sql
   UPDATE users SET password_hash = '<bcrypt_hash>' WHERE email = 'your-email@example.com';
   ```

4. **Or promote another user to admin**:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'another-email@example.com';
   ```

---

## 9. Revenue System Configuration

### What are the default coin values for each revenue method?

**Default Coin Values:**

- **Linkvertise**: 50 coins per completion (30 min cooldown)
- **AFK Page**: 1 coin per minute (max 60 min per session, 15 min cooldown)
- **Surveys**: 100-500 coins (random range)
- **Ads**: 10 coins per view (max 20 views per day)
- **Referral**: 500 coins bonus for referrer, 10% commission on referred user's earnings
- **Daily Login**: 25 coins per day

### Can I change coin rewards after installation?

**Yes, you can change coin rewards:**

Edit values in your `.env` file:
```bash
LINKVERTISE_COINS=50
AFK_COINS_PER_MINUTE=1
SURVEY_MIN_COINS=100
SURVEY_MAX_COINS=500
ADS_COINS_PER_VIEW=10
REFERRAL_BONUS=500
DAILY_LOGIN_COINS=25
```

Then restart services:
```bash
docker-compose restart
```

### How does the Linkvertise API key work, and is it required?

**Linkvertise API Key is OPTIONAL:**

- **Without API Key** (Manual Mode - Default):
  - Set `LINKVERTISE_MANUAL_MODE=true` in `.env`
  - Users manually mark completion after viewing the link
  - No API key required
  - Users click "Mark as Complete" button

- **With API Key** (Automatic Verification):
  - Set `LINKVERTISE_API_KEY=your-api-key` in `.env`
  - Set `LINKVERTISE_MANUAL_MODE=false`
  - Linkvertise API automatically verifies completion
  - Requires a Linkvertise account with API access

**To get Linkvertise API Key:**
1. Sign up at https://linkvertise.com
2. Go to your dashboard → API settings
3. Generate an API key
4. Add it to your `.env` file

---

## 10. Troubleshooting

### What should I do if the setup script fails?

**Troubleshooting Steps:**

1. **Check error messages** in the terminal output
2. **Verify internet connection** (required for downloading Docker images)
3. **Ensure sufficient disk space** (at least 10GB free)
4. **Check Docker daemon is running**:
   ```bash
   sudo systemctl status docker
   ```
   If not running: `sudo systemctl start docker`

5. **Try installing prerequisites manually**:
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo apt install docker-compose-plugin  # Ubuntu/Debian
   ```

6. **Check logs** for specific errors:
   ```bash
   docker-compose logs
   ```

### Where are the logs if something goes wrong?

**Log Locations:**

- **Application logs**:
  ```bash
  docker-compose logs -f aether-dashboard
  ```

- **Database logs**:
  ```bash
  docker-compose logs -f postgres
  ```

- **Redis logs**:
  ```bash
  docker-compose logs -f redis
  ```

- **All services**:
  ```bash
  docker-compose logs -f
  ```

- **Specific service with timestamps**:
  ```bash
  docker-compose logs -f --timestamps aether-dashboard
  ```

### How do I uninstall or reinstall if needed?

**Uninstall Steps:**

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: This deletes all data!)
docker-compose down -v

# Remove images
docker rmi aether-dashboard:latest

# Remove Docker volumes (if needed)
docker volume ls  # List volumes
docker volume rm aether-dashboard_postgres_data
docker volume rm aether-dashboard_redis_data
```

**Clean Reinstall:**

```bash
# 1. Stop and remove everything
docker-compose down -v

# 2. Remove .env file (optional - to start fresh)
rm .env

# 3. Run setup script again
./setup.sh
```

---

## 11. Updates and Maintenance

### How do I update the dashboard to a newer version?

You can update the dashboard in two ways:

**Option 1: In-App Update (Recommended, if enabled)**

The dashboard includes a built-in update feature that allows admins to update directly from the Admin Panel:

1. **Enable the feature** (one-time setup):
   - Add `ENABLE_SYSTEM_UPDATE=true` to your `.env` file
   - Restart the container: `docker-compose restart aether-dashboard`

2. **Update from Admin Panel**:
   - Navigate to **Admin Panel** → **Settings** tab
   - Scroll to **"System Update"** section
   - Click **"Update Now"** button
   - Monitor progress in the update modal
   - The system will automatically:
     - Pull latest code from GitHub
     - Rebuild containers
     - Run database migrations
     - Verify system health

**Security Note**: The in-app update feature is disabled by default for security reasons. Only enable it if you trust all administrators with system access. See the [README.md](README.md#in-app-system-updates) for more details.

**Option 2: Manual Update (Fallback)**

If the in-app update feature is disabled or fails, you can update manually:

**Update Steps:**

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart services
docker-compose up -d --build

# 3. Run migrations if needed (usually automatic)
docker-compose exec aether-dashboard npm run migrate

# 4. Verify installation
docker-compose ps
curl http://localhost:5000/health
```

**Note**: Always backup your data before updating!

### Will updates affect my existing data and configuration?

**Data Safety:**
- ✅ Updates preserve existing data (stored in Docker volumes)
- ✅ Database migrations are backward-compatible when possible
- ✅ Your `.env` configuration is preserved
- ⚠️ Always backup before major updates

**What Gets Updated:**
- Application code
- Dependencies (npm packages)
- Docker images

**What Stays the Same:**
- Database data
- User accounts
- Server configurations
- Environment variables (`.env` file)

### How do I backup my data?

**Backup Methods:**

1. **Backup Database**:
   ```bash
   docker-compose exec postgres pg_dump -U postgres aether_dashboard > backup_$(date +%Y%m%d).sql
   ```

2. **Backup .env file**:
   ```bash
   cp .env .env.backup
   ```

3. **Backup Docker Volumes**:
   ```bash
   # Backup PostgreSQL volume
   docker run --rm -v aether-dashboard_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz /data
   
   # Backup Redis volume
   docker run --rm -v aether-dashboard_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup_$(date +%Y%m%d).tar.gz /data
   ```

4. **Restore Database**:
   ```bash
   cat backup_20240101.sql | docker-compose exec -T postgres psql -U postgres -d aether_dashboard
   ```

---

## 12. Production Deployment

### Is this ready for production use, or is it still in development?

**Yes, this is production-ready!**

The dashboard includes:
- ✅ Security features (JWT, bcrypt, rate limiting, CORS, Helmet.js)
- ✅ Error handling and logging
- ✅ Database migrations
- ✅ Health checks
- ✅ Docker containerization
- ✅ Trust proxy for reverse proxies
- ✅ Input validation and sanitization

### What about security best practices for production?

**Security Recommendations:**

1. **Strong Secrets**:
   - Use a strong `JWT_SECRET` (minimum 32 characters)
   - Generate with: `openssl rand -base64 32`
   - Use strong database passwords

2. **Firewall Configuration**:
   - Only open necessary ports (port 5000 or your dashboard port)
   - Keep PostgreSQL and Redis internal (not exposed)

3. **HTTPS/SSL**:
   - Use HTTPS via Cloudflare or reverse proxy (nginx/Apache)
   - Never expose the dashboard directly on HTTP in production

4. **Admin Access Control**:
   - Set `ADMIN_EMAIL` to control who gets admin access
   - Regularly review admin users

5. **Regular Updates**:
   - Keep dependencies updated
   - Monitor security advisories
   - Update Docker images regularly

6. **Monitoring**:
   - Monitor logs for suspicious activity
   - Set up health check monitoring
   - Monitor resource usage

7. **Backups**:
   - Regular database backups
   - Backup `.env` file securely
   - Test restore procedures

### Are there any known limitations or issues?

**Current Limitations:**

1. **Docker Requirement**:
   - Requires Docker (cannot run natively without containerization)
   - Not suitable for environments without Docker support

2. **Pterodactyl Dependency**:
   - Server creation requires Pterodactyl Panel integration
   - Cannot create servers without Pterodactyl

3. **Revenue Features**:
   - Some revenue features (surveys, ads) need external integrations
   - Linkvertise manual mode works without API key

4. **Email Notifications**:
   - No built-in email notifications (future enhancement)
   - Users must check dashboard for updates

5. **Multi-language**:
   - Currently English only (future enhancement)

6. **Two-Factor Authentication**:
   - Not yet implemented (future enhancement)

**Known Issues:**
- None currently reported. If you encounter issues, please report them on GitHub.

---

## Additional Resources

- **GitHub Repository**: [https://github.com/Shaf2665/AETHER_DASHBOARD](https://github.com/Shaf2665/AETHER_DASHBOARD)
- **Docker Documentation**: See `DOCKER.md` for detailed Docker setup
- **API Documentation**: See `README.md` for API endpoints

---

**Still have questions?** Open an issue on GitHub or check the documentation files.

