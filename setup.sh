#!/bin/bash

# Aether Dashboard - Interactive Setup Wizard
# This script guides you through the installation and configuration process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║      Aether Dashboard - Interactive Setup Wizard       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to validate URL
validate_url() {
    if [[ $1 =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

# Function to validate port
validate_port() {
    if [[ $1 =~ ^[0-9]+$ ]] && [ "$1" -ge 1 ] && [ "$1" -le 65535 ]; then
        return 0
    else
        return 1
    fi
}

# Step 1: Check prerequisites
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Checking Prerequisites${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    print_success "Docker is installed (version: $DOCKER_VERSION)"
else
    print_error "Docker is not installed"
    echo ""
    echo "Please install Docker first:"
    echo "  - Linux: https://docs.docker.com/engine/install/"
    echo "  - macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "  - Windows: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
fi

# Check Docker Compose
if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version | awk '{print $4}')
        print_success "Docker Compose is installed (version: $COMPOSE_VERSION)"
        DOCKER_COMPOSE_CMD="docker compose"
    else
        COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
        print_success "Docker Compose is installed (version: $COMPOSE_VERSION)"
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
else
    print_error "Docker Compose is not installed"
    echo ""
    echo "Please install Docker Compose first:"
    echo "  https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Docker is running
if docker info >/dev/null 2>&1; then
    print_success "Docker daemon is running"
else
    print_error "Docker daemon is not running"
    echo ""
    echo "Please start Docker and try again."
    exit 1
fi

echo ""

# Step 2: Check if .env already exists
if [ -f .env ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    print_warning "A .env file already exists!"
    echo ""
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        print_info "Keeping existing .env file"
        echo ""
        read -p "Do you want to continue with setup? (Y/n): " continue_setup
        if [[ $continue_setup =~ ^[Nn]$ ]]; then
            echo "Setup cancelled."
            exit 0
        fi
        SKIP_ENV_CREATION=true
    else
        print_info "Will overwrite existing .env file"
        SKIP_ENV_CREATION=false
    fi
    echo ""
else
    SKIP_ENV_CREATION=false
fi

# Step 3: Configuration
if [ "$SKIP_ENV_CREATION" != "true" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 2: Configuration${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    print_info "We'll ask you a few questions to configure Aether Dashboard"
    echo ""

    # Server Configuration
    echo -e "${YELLOW}Server Configuration${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    read -p "Port (default: 5000): " PORT
    PORT=${PORT:-5000}
    while ! validate_port "$PORT"; do
        print_error "Invalid port. Please enter a number between 1 and 65535."
        read -p "Port (default: 5000): " PORT
        PORT=${PORT:-5000}
    done
    print_success "Port set to: $PORT"
    echo ""

    # JWT Secret
    echo -e "${YELLOW}Security Configuration${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    read -p "Generate a secure JWT secret automatically? (Y/n): " generate_jwt
    if [[ ! $generate_jwt =~ ^[Nn]$ ]]; then
        JWT_SECRET=$(generate_secret)
        print_success "JWT secret generated automatically"
    else
        read -p "Enter your JWT secret (minimum 32 characters): " JWT_SECRET
        while [ ${#JWT_SECRET} -lt 32 ]; do
            print_error "JWT secret must be at least 32 characters long"
            read -p "Enter your JWT secret (minimum 32 characters): " JWT_SECRET
        done
        print_success "JWT secret set"
    fi
    echo ""

    # Database Configuration
    echo -e "${YELLOW}Database Configuration${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    read -p "Database name (default: aether_dashboard): " DB_NAME
    DB_NAME=${DB_NAME:-aether_dashboard}
    
    read -p "Database user (default: postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -sp "Database password: " DB_PASSWORD
    echo ""
    while [ -z "$DB_PASSWORD" ]; do
        print_error "Database password cannot be empty"
        read -sp "Database password: " DB_PASSWORD
        echo ""
    done
    print_success "Database configuration set"
    echo ""

    # Redis Configuration
    echo -e "${YELLOW}Redis Configuration${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    read -p "Enable Redis? (Y/n): " enable_redis
    if [[ $enable_redis =~ ^[Nn]$ ]]; then
        REDIS_ENABLED="false"
        REDIS_PASSWORD=""
        print_info "Redis disabled"
    else
        REDIS_ENABLED="true"
        read -sp "Redis password (optional, press Enter to skip): " REDIS_PASSWORD
        echo ""
        REDIS_PASSWORD=${REDIS_PASSWORD:-}
        print_success "Redis enabled"
    fi
    echo ""

    # Pterodactyl Configuration
    echo -e "${YELLOW}Pterodactyl Panel Configuration${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    print_info "You'll need API keys from your Pterodactyl Panel"
    echo ""
    
    read -p "Pterodactyl Panel URL: " PTERODACTYL_URL
    while [ -z "$PTERODACTYL_URL" ] || ! validate_url "$PTERODACTYL_URL"; do
        print_error "Please enter a valid URL (e.g., https://panel.example.com)"
        read -p "Pterodactyl Panel URL: " PTERODACTYL_URL
    done
    
    read -p "Pterodactyl Application API Key: " PTERODACTYL_APPLICATION_API_KEY
    read -p "Pterodactyl Client API Key: " PTERODACTYL_CLIENT_API_KEY
    
    # Optional: API Key (legacy)
    read -p "Pterodactyl API Key (optional, press Enter to skip): " PTERODACTYL_API_KEY
    PTERODACTYL_API_KEY=${PTERODACTYL_API_KEY:-}
    
    print_success "Pterodactyl configuration set"
    echo ""

    # Revenue System Configuration
    echo -e "${YELLOW}Revenue System Configuration${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    print_info "Configure coin earning methods (press Enter for defaults)"
    echo ""
    
    read -p "Enable Linkvertise? (Y/n): " enable_linkvertise
    LINKVERTISE_ENABLED=${enable_linkvertise:-Y}
    if [[ ! $LINKVERTISE_ENABLED =~ ^[Nn]$ ]]; then
        LINKVERTISE_ENABLED="true"
        read -p "Linkvertise API Key (optional): " LINKVERTISE_API_KEY
        LINKVERTISE_API_KEY=${LINKVERTISE_API_KEY:-}
        read -p "Coins per completion (default: 50): " LINKVERTISE_COINS
        LINKVERTISE_COINS=${LINKVERTISE_COINS:-50}
    else
        LINKVERTISE_ENABLED="false"
        LINKVERTISE_API_KEY=""
        LINKVERTISE_COINS="50"
    fi
    
    read -p "Enable AFK page? (Y/n): " enable_afk
    AFK_ENABLED=${enable_afk:-Y}
    AFK_ENABLED=$([ "$AFK_ENABLED" != "n" ] && [ "$AFK_ENABLED" != "N" ] && echo "true" || echo "false")
    
    read -p "Enable Surveys? (Y/n): " enable_surveys
    SURVEYS_ENABLED=${enable_surveys:-Y}
    SURVEYS_ENABLED=$([ "$SURVEYS_ENABLED" != "n" ] && [ "$SURVEYS_ENABLED" != "N" ] && echo "true" || echo "false")
    
    read -p "Enable Ads? (Y/n): " enable_ads
    ADS_ENABLED=${enable_ads:-Y}
    ADS_ENABLED=$([ "$ADS_ENABLED" != "n" ] && [ "$ADS_ENABLED" != "N" ] && echo "true" || echo "false")
    
    read -p "Enable Referral system? (Y/n): " enable_referral
    REFERRAL_ENABLED=${enable_referral:-Y}
    REFERRAL_ENABLED=$([ "$REFERRAL_ENABLED" != "n" ] && [ "$REFERRAL_ENABLED" != "N" ] && echo "true" || echo "false")
    
    read -p "Enable Daily login bonus? (Y/n): " enable_daily
    DAILY_LOGIN_ENABLED=${enable_daily:-Y}
    DAILY_LOGIN_ENABLED=$([ "$DAILY_LOGIN_ENABLED" != "n" ] && [ "$DAILY_LOGIN_ENABLED" != "N" ] && echo "true" || echo "false")
    
    print_success "Revenue system configuration set"
    echo ""

    # Step 4: Create .env file
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 3: Creating Configuration File${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    cat > .env << EOF
# Aether Dashboard Configuration
# Generated by setup.sh on $(date)

# Server Configuration
NODE_ENV=production
PORT=$PORT

# JWT Secret (DO NOT SHARE THIS!)
JWT_SECRET=$JWT_SECRET

# Database Configuration
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Redis Configuration
REDIS_ENABLED=$REDIS_ENABLED
REDIS_PASSWORD=$REDIS_PASSWORD

# Pterodactyl Panel Configuration
PTERODACTYL_URL=$PTERODACTYL_URL
PTERODACTYL_API_KEY=$PTERODACTYL_API_KEY
PTERODACTYL_CLIENT_API_KEY=$PTERODACTYL_CLIENT_API_KEY
PTERODACTYL_APPLICATION_API_KEY=$PTERODACTYL_APPLICATION_API_KEY

# Revenue System Configuration
LINKVERTISE_ENABLED=$LINKVERTISE_ENABLED
LINKVERTISE_API_KEY=$LINKVERTISE_API_KEY
LINKVERTISE_COINS=${LINKVERTISE_COINS:-50}
LINKVERTISE_COOLDOWN=30

AFK_ENABLED=$AFK_ENABLED
AFK_COINS_PER_MINUTE=1
AFK_MAX_MINUTES=60
AFK_COOLDOWN=15

SURVEYS_ENABLED=$SURVEYS_ENABLED
SURVEY_MIN_COINS=100
SURVEY_MAX_COINS=500

ADS_ENABLED=$ADS_ENABLED
ADS_COINS_PER_VIEW=10
ADS_MAX_VIEWS=20

REFERRAL_ENABLED=$REFERRAL_ENABLED
REFERRAL_BONUS=500
REFERRAL_COMMISSION=10

DAILY_LOGIN_ENABLED=$DAILY_LOGIN_ENABLED
DAILY_LOGIN_COINS=25
EOF

    print_success ".env file created successfully"
    echo ""
fi

# Step 5: Build and start services
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Building and Starting Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Do you want to build and start the services now? (Y/n): " start_services
if [[ $start_services =~ ^[Nn]$ ]]; then
    print_info "Skipping service startup"
    echo ""
    echo "To start services later, run:"
    echo "  $DOCKER_COMPOSE_CMD up -d"
    exit 0
fi

echo ""
print_info "Building Docker images (this may take a few minutes)..."
$DOCKER_COMPOSE_CMD build

echo ""
print_info "Starting services..."
$DOCKER_COMPOSE_CMD up -d

echo ""
print_info "Waiting for services to be ready..."
sleep 10

# Check if services are running
if $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
    print_success "Services are running"
else
    print_error "Some services failed to start"
    echo ""
    echo "Check logs with: $DOCKER_COMPOSE_CMD logs"
    exit 1
fi

# Step 6: Run migrations
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Setting Up Database${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

print_info "Waiting for database to be ready..."
sleep 5

print_info "Running database migrations..."
if $DOCKER_COMPOSE_CMD exec -T aether-dashboard npm run migrate >/dev/null 2>&1; then
    print_success "Database migrations completed"
else
    print_warning "Migration command returned an error, but this might be normal if migrations already ran"
    print_info "Checking database connection..."
    sleep 2
fi

# Step 7: Verify installation
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 6: Verifying Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

print_info "Checking service health..."
sleep 5

if curl -f -s http://localhost:$PORT/health >/dev/null 2>&1; then
    print_success "Aether Dashboard is running and healthy!"
else
    print_warning "Health check failed, but services might still be starting"
    print_info "Wait a few more seconds and check: http://localhost:$PORT/health"
fi

# Final summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Installation Complete! 🎉                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Access Your Aether Dashboard:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Application:${NC}  http://localhost:$PORT"
echo -e "  ${GREEN}Health Check:${NC}  http://localhost:$PORT/health"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  View logs:        $DOCKER_COMPOSE_CMD logs -f aether-dashboard"
echo "  Stop services:    $DOCKER_COMPOSE_CMD down"
echo "  Restart:          $DOCKER_COMPOSE_CMD restart"
echo "  View status:      $DOCKER_COMPOSE_CMD ps"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  1. Open http://localhost:$PORT in your browser"
echo "  2. Register your first admin account"
echo "  3. Configure your Pterodactyl Panel integration"
echo "  4. Start managing game servers!"
echo ""
echo -e "${GREEN}Enjoy using Aether Dashboard! 🚀${NC}"
echo ""

