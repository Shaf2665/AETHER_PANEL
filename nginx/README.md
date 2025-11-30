# Nginx Reverse Proxy Setup for Aether Dashboard

This guide will help you set up nginx as a reverse proxy for Aether Dashboard. The setup script can automatically configure nginx for you, or you can configure it manually using the templates provided.

## Automatic Configuration (Recommended)

The setup script (`setup.sh`) can automatically configure nginx during installation:

1. Run the full installation: `./setup.sh` → Select "Full Installation"
2. After Docker services start, the script will ask if you want to configure nginx
3. Choose your SSL configuration:
   - **Cloudflare Flexible SSL** (HTTP only, Cloudflare handles HTTPS)
   - **Let's Encrypt** (HTTPS with SSL certificates on server)
4. The script will automatically:
   - Install nginx if needed
   - Extract domain from `FRONTEND_URL`
   - Copy and customize the appropriate template
   - Test and reload nginx

## Manual Configuration

If you prefer to configure nginx manually, or if automatic configuration was skipped, follow the steps below.

## Configuration Templates

Two nginx configuration templates are available:

### 1. Cloudflare Flexible SSL (`aether-dashboard-cloudflare.conf`)
- **Use when**: You're using Cloudflare proxy (orange cloud) with Flexible SSL mode
- **Configuration**: HTTP only (port 80)
- **SSL**: Cloudflare handles HTTPS termination
- **Best for**: Users already using Cloudflare

### 2. Let's Encrypt (`aether-dashboard-letsencrypt.conf`)
- **Use when**: You want SSL certificates directly on your server
- **Configuration**: HTTP to HTTPS redirect + HTTPS server block (ports 80 and 443)
- **SSL**: Let's Encrypt certificates managed by Certbot
- **Best for**: Direct server SSL without Cloudflare

## Prerequisites

- Aether Dashboard running on `http://localhost:5000` (or your configured port)
- Domain name pointing to your server (e.g., `dashboard.aetherpanel.com`)
- Root or sudo access to your server
- Port 80 (and 443 for Let's Encrypt) open in your firewall

## Manual Installation Steps

### 1. Install Nginx

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx -y
```

**CentOS/RHEL/Fedora:**
```bash
sudo yum install nginx -y
# or for newer versions
sudo dnf install nginx -y
```

**Arch Linux:**
```bash
sudo pacman -S nginx
```

### 2. Install Certbot (Let's Encrypt) - Only if using Let's Encrypt template

**Note:** Skip this step if you're using the Cloudflare template. Certbot is only needed for Let's Encrypt SSL certificates.

**Ubuntu/Debian:**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

**CentOS/RHEL/Fedora:**
```bash
sudo yum install certbot python3-certbot-nginx -y
# or
sudo dnf install certbot python3-certbot-nginx -y
```

**Arch Linux:**
```bash
sudo pacman -S certbot certbot-nginx
```

### 3. Choose and Copy Configuration File

**Choose the appropriate template based on your setup:**

**For Cloudflare Flexible SSL:**
```bash
# Copy the Cloudflare configuration file
sudo cp nginx/aether-dashboard-cloudflare.conf /etc/nginx/sites-available/aether-dashboard.conf
```

**For Let's Encrypt (HTTPS on server):**
```bash
# Copy the Let's Encrypt configuration file
sudo cp nginx/aether-dashboard-letsencrypt.conf /etc/nginx/sites-available/aether-dashboard.conf
```

**Create symbolic link to enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/aether-dashboard.conf /etc/nginx/sites-enabled/
```

**Note:** If you're using a different domain, edit the configuration file and replace `dashboard.aetherpanel.com` with your domain:

```bash
sudo nano /etc/nginx/sites-available/aether-dashboard.conf
```

Replace all occurrences of `dashboard.aetherpanel.com` with your domain name. Also update `localhost:5000` if your dashboard runs on a different port.

### 4. Test Nginx Configuration (Both Templates)

Before proceeding, test the nginx configuration:

```bash
sudo nginx -t
```

If the test is successful, you should see:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Configure SSL (Let's Encrypt Template Only)

**Skip this section if using Cloudflare template.**

#### 5.1. Create Directory for Let's Encrypt Verification

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

#### 5.2. Reload Nginx

Reload nginx to ensure it's running with the new configuration:

```bash
sudo systemctl reload nginx
```

#### 5.3. Obtain SSL Certificate

Obtain the SSL certificate using Certbot:

```bash
sudo certbot --nginx -d dashboard.aetherpanel.com
```

**Note:** Replace `dashboard.aetherpanel.com` with your actual domain name.

Certbot will:
- Automatically configure SSL in your nginx configuration
- Set up automatic certificate renewal
- Ask for your email address (for renewal notifications)
- Ask if you want to redirect HTTP to HTTPS (choose "Yes")

#### 5.4. Verify SSL Certificate

After Certbot completes, verify the SSL certificate:

```bash
sudo certbot certificates
```

You should see your certificate listed with expiration date.

### 6. Verify Dashboard Access

Test access to your dashboard:

**For Cloudflare template:**
```bash
# Test HTTP access (Cloudflare will handle HTTPS)
curl -I http://dashboard.aetherpanel.com
```

**For Let's Encrypt template:**
```bash
# Test HTTP redirect (should redirect to HTTPS)
curl -I http://dashboard.aetherpanel.com

# Test HTTPS access
curl -I https://dashboard.aetherpanel.com
```

Open your browser and navigate to your domain - you should see the dashboard. With Cloudflare, HTTPS is automatic. With Let's Encrypt, use `https://`.

## Configuration Details

### What the Configurations Do

**Cloudflare Template:**
1. **HTTP Only**: Listens on port 80 (HTTP)
2. **Cloudflare Integration**: Forwards Cloudflare-specific headers (CF-Connecting-IP, CF-Ray)
3. **Proxy Headers**: Properly forwards `X-Forwarded-*` headers for Express trust proxy
4. **WebSocket Support**: Ready for WebSocket connections if needed
5. **Health Check**: Separate location block for health checks

**Let's Encrypt Template:**
1. **HTTP to HTTPS Redirect**: All HTTP traffic is automatically redirected to HTTPS
2. **SSL/TLS**: Modern SSL configuration with TLS 1.2 and 1.3
3. **Security Headers**: Adds security headers (HSTS, X-Frame-Options, etc.)
4. **Proxy Headers**: Properly forwards `X-Forwarded-*` headers for Express trust proxy
5. **WebSocket Support**: Ready for WebSocket connections if needed
6. **Health Check**: Separate location block for health checks

### Important Notes

- The configuration proxies to `http://localhost:5000` (or your configured port) - ensure your dashboard is running
- The Express application has trust proxy enabled, so it will correctly detect HTTPS/proxy
- Update `FRONTEND_URL` in your `.env` file to match your domain:
  ```bash
  # For Cloudflare
  FRONTEND_URL=https://dashboard.aetherpanel.com
  
  # For Let's Encrypt
  FRONTEND_URL=https://dashboard.aetherpanel.com
  ```
- **Cloudflare users**: Set Cloudflare SSL/TLS mode to "Flexible" (HTTPS to Cloudflare, HTTP to origin)

## Troubleshooting

### Nginx Won't Start

Check nginx error logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

Common issues:
- Port 80 or 443 already in use
- SSL certificate paths incorrect
- Configuration syntax errors

### SSL Certificate Issues

If you have SSL certificate issues:

1. **Check certificate paths:**
   ```bash
   sudo ls -la /etc/letsencrypt/live/dashboard.aetherpanel.com/
   ```

2. **Renew certificate manually:**
   ```bash
   sudo certbot renew --dry-run
   ```

3. **Check certificate expiration:**
   ```bash
   sudo certbot certificates
   ```

### Dashboard Not Accessible

1. **Check if dashboard is running:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check nginx access logs:**
   ```bash
   sudo tail -f /var/log/nginx/aether-dashboard-access.log
   ```

3. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/aether-dashboard-error.log
   ```

4. **Verify firewall allows ports 80 and 443:**
   ```bash
   # UFW
   sudo ufw status | grep -E '(80|443)'
   
   # Firewalld
   sudo firewall-cmd --list-ports
   ```

### Certificate Renewal

Certbot automatically sets up renewal, but you can test it:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
```

Certificates are automatically renewed 30 days before expiration.

## Maintenance

### Reload Nginx After Configuration Changes

```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload without downtime
```

### Restart Nginx

```bash
sudo systemctl restart nginx
```

### Check Nginx Status

```bash
sudo systemctl status nginx
```

## Additional Security (Optional)

### Rate Limiting

Add rate limiting to prevent abuse:

```nginx
# Add to http block in /etc/nginx/nginx.conf
limit_req_zone $binary_remote_addr zone=dashboard_limit:10m rate=10r/s;

# Add to server block
limit_req zone=dashboard_limit burst=20 nodelay;
```

### IP Whitelisting (Optional)

If you want to restrict access to specific IPs:

```nginx
# Add to server block
allow 1.2.3.4;  # Your IP
deny all;
```

## Support

For issues related to:
- **Nginx configuration**: Check nginx logs and configuration syntax
- **SSL certificates**: Check Certbot documentation
- **Dashboard access**: Verify dashboard is running and check application logs

For Aether Dashboard specific issues, refer to the main README.md or FAQ.md.

