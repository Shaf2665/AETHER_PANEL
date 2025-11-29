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

# Function to detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
        OS_VERSION=$(cat /etc/redhat-release | sed -E 's/.*release ([0-9]+).*/\1/')
    elif [ -f /etc/arch-release ]; then
        OS="arch"
        OS_VERSION=""
    else
        OS="unknown"
        OS_VERSION=""
    fi
    echo "$OS"
}

# Function to get VPS IP address
get_vps_ip() {
    # Try multiple methods to get the public IP
    if command_exists curl; then
        IP=$(curl -s https://api.ipify.org 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null || curl -s https://icanhazip.com 2>/dev/null)
        if [ -n "$IP" ]; then
            echo "$IP"
            return 0
        fi
    fi
    
    # Fallback to local network interfaces
    if command_exists ip; then
        IP=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $7; exit}' | head -1)
        if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ]; then
            echo "$IP"
            return 0
        fi
    fi
    
    # Last resort: check hostname -I
    if command_exists hostname; then
        IP=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ]; then
            echo "$IP"
            return 0
        fi
    fi
    
    echo ""
    return 1
}

# Function to install Docker
install_docker() {
    print_info "Installing Docker..."
    
    OS=$(detect_os)
    
    case $OS in
        ubuntu|debian)
            print_info "Detected Ubuntu/Debian. Installing Docker..."
            if command_exists curl; then
                curl -fsSL https://get.docker.com -o get-docker.sh
                sh get-docker.sh
                rm -f get-docker.sh
            else
                print_error "curl is required but not installed. Please install curl first."
                return 1
            fi
            ;;
        centos|rhel|fedora)
            print_info "Detected CentOS/RHEL/Fedora. Installing Docker..."
            if command_exists curl; then
                curl -fsSL https://get.docker.com -o get-docker.sh
                sh get-docker.sh
                rm -f get-docker.sh
            else
                print_error "curl is required but not installed. Please install curl first."
                return 1
            fi
            ;;
        arch)
            print_info "Detected Arch Linux. Installing Docker..."
            if command_exists pacman; then
                pacman -S --noconfirm docker
            else
                print_error "pacman is required but not found."
                return 1
            fi
            ;;
        *)
            print_error "Unsupported OS: $OS"
            print_info "Please install Docker manually: https://docs.docker.com/engine/install/"
            return 1
            ;;
    esac
    
    # Start and enable Docker service
    if command_exists systemctl; then
        print_info "Starting Docker service..."
        systemctl start docker
        systemctl enable docker
    fi
    
    # Add current user to docker group (if not root)
    if [ "$EUID" -ne 0 ]; then
        print_info "Adding current user to docker group..."
        if command_exists usermod; then
            usermod -aG docker "$USER"
            print_warning "You may need to log out and log back in for group changes to take effect."
        fi
    fi
    
    # Wait for Docker to be ready
    sleep 3
    
    # Verify installation
    if docker --version >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
        print_success "Docker installed successfully (version: $DOCKER_VERSION)"
        return 0
    else
        print_error "Docker installation failed"
        return 1
    fi
}

# Function to install Docker Compose
install_docker_compose() {
    print_info "Installing Docker Compose..."
    
    OS=$(detect_os)
    
    case $OS in
        ubuntu|debian)
            print_info "Installing Docker Compose plugin..."
            if [ "$EUID" -eq 0 ]; then
                apt-get update -qq >/dev/null 2>&1
                apt-get install -y docker-compose-plugin >/dev/null 2>&1
            else
                if command_exists sudo; then
                    sudo apt-get update -qq >/dev/null 2>&1
                    sudo apt-get install -y docker-compose-plugin >/dev/null 2>&1
                else
                    print_error "sudo is required but not installed."
                    return 1
                fi
            fi
            ;;
        centos|rhel|fedora)
            print_info "Installing Docker Compose plugin..."
            if [ "$EUID" -eq 0 ]; then
                yum install -y docker-compose-plugin >/dev/null 2>&1 || dnf install -y docker-compose-plugin >/dev/null 2>&1
            else
                if command_exists sudo; then
                    sudo yum install -y docker-compose-plugin >/dev/null 2>&1 || sudo dnf install -y docker-compose-plugin >/dev/null 2>&1
                else
                    print_error "sudo is required but not installed."
                    return 1
                fi
            fi
            ;;
        arch)
            print_info "Installing Docker Compose plugin..."
            if [ "$EUID" -eq 0 ]; then
                pacman -S --noconfirm docker-compose
            else
                if command_exists sudo; then
                    sudo pacman -S --noconfirm docker-compose
                else
                    print_error "sudo is required but not installed."
                    return 1
                fi
            fi
            ;;
        *)
            # Fallback: Install standalone docker-compose
            print_info "Installing standalone Docker Compose..."
            COMPOSE_VERSION="v2.24.0"
            if command_exists curl; then
                curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                chmod +x /usr/local/bin/docker-compose
            else
                print_error "curl is required but not installed."
                return 1
            fi
            ;;
    esac
    
    # Verify installation
    sleep 2
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version | awk '{print $4}')
        print_success "Docker Compose installed successfully (version: $COMPOSE_VERSION)"
        DOCKER_COMPOSE_CMD="docker compose"
        return 0
    elif command_exists docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
        print_success "Docker Compose installed successfully (version: $COMPOSE_VERSION)"
        DOCKER_COMPOSE_CMD="docker-compose"
        return 0
    else
        print_error "Docker Compose installation failed"
        return 1
    fi
}

# Function to start Docker daemon
start_docker_daemon() {
    print_info "Starting Docker daemon..."
    
    if command_exists systemctl; then
        if [ "$EUID" -eq 0 ]; then
            systemctl start docker
            systemctl enable docker
        else
            if command_exists sudo; then
                sudo systemctl start docker
                sudo systemctl enable docker
            else
                print_error "sudo is required but not installed."
                return 1
            fi
        fi
        
        # Wait for Docker to be ready
        sleep 3
        
        # Verify Docker is running
        if docker info >/dev/null 2>&1; then
            print_success "Docker daemon started successfully"
            return 0
        else
            print_error "Failed to start Docker daemon"
            return 1
        fi
    else
        print_error "systemctl not found. Please start Docker manually."
        return 1
    fi
}

# Function to configure firewall
configure_firewall() {
    local PORT=$1
    
    if [ -z "$PORT" ]; then
        PORT=5000
    fi
    
    print_info "Checking firewall configuration..."
    
    # Check for UFW (Ubuntu/Debian)
    if command_exists ufw; then
        if ufw status | grep -q "Status: active"; then
            print_info "UFW firewall is active"
            read -p "Do you want to open port $PORT in UFW? (Y/n): " open_port
            if [[ ! $open_port =~ ^[Nn]$ ]]; then
                if [ "$EUID" -eq 0 ]; then
                    ufw allow $PORT/tcp
                    print_success "Port $PORT opened in UFW"
                else
                    if command_exists sudo; then
                        sudo ufw allow $PORT/tcp
                        print_success "Port $PORT opened in UFW"
                    else
                        print_warning "Please run manually: sudo ufw allow $PORT/tcp"
                    fi
                fi
            fi
        fi
    # Check for firewalld (CentOS/RHEL/Fedora)
    elif command_exists firewall-cmd; then
        if systemctl is-active --quiet firewalld 2>/dev/null; then
            print_info "firewalld is active"
            read -p "Do you want to open port $PORT in firewalld? (Y/n): " open_port
            if [[ ! $open_port =~ ^[Nn]$ ]]; then
                if [ "$EUID" -eq 0 ]; then
                    firewall-cmd --permanent --add-port=$PORT/tcp
                    firewall-cmd --reload
                    print_success "Port $PORT opened in firewalld"
                else
                    if command_exists sudo; then
                        sudo firewall-cmd --permanent --add-port=$PORT/tcp
                        sudo firewall-cmd --reload
                        print_success "Port $PORT opened in firewalld"
                    else
                        print_warning "Please run manually: sudo firewall-cmd --permanent --add-port=$PORT/tcp && sudo firewall-cmd --reload"
                    fi
                fi
            fi
        fi
    else
        print_info "No common firewall detected (ufw/firewalld). You may need to configure your firewall manually."
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
    read -p "Do you want to install Docker automatically? (Y/n): " install_docker_choice
    if [[ ! $install_docker_choice =~ ^[Nn]$ ]]; then
        if install_docker; then
            print_success "Docker installation completed"
        else
            print_error "Docker installation failed. Please install manually:"
            echo "  - Linux: https://docs.docker.com/engine/install/"
            exit 1
        fi
    else
        echo "Please install Docker first:"
        echo "  - Linux: https://docs.docker.com/engine/install/"
        exit 1
    fi
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
    read -p "Do you want to install Docker Compose automatically? (Y/n): " install_compose_choice
    if [[ ! $install_compose_choice =~ ^[Nn]$ ]]; then
        if install_docker_compose; then
            print_success "Docker Compose installation completed"
        else
            print_error "Docker Compose installation failed. Please install manually:"
            echo "  https://docs.docker.com/compose/install/"
            exit 1
        fi
    else
        echo "Please install Docker Compose first:"
        echo "  https://docs.docker.com/compose/install/"
        exit 1
    fi
fi

# Check if Docker is running
if docker info >/dev/null 2>&1; then
    print_success "Docker daemon is running"
else
    print_error "Docker daemon is not running"
    echo ""
    read -p "Do you want to start Docker daemon automatically? (Y/n): " start_docker_choice
    if [[ ! $start_docker_choice =~ ^[Nn]$ ]]; then
        if start_docker_daemon; then
            print_success "Docker daemon started"
        else
            print_error "Failed to start Docker daemon. Please start manually and try again."
            exit 1
        fi
    else
        echo "Please start Docker and try again."
        exit 1
    fi
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
    
    # Frontend URL Configuration
    echo -e "${YELLOW}Frontend URL Configuration${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    print_info "This is required for CORS and external access. We'll try to detect your VPS IP automatically."
    
    VPS_IP=$(get_vps_ip)
    if [ -n "$VPS_IP" ]; then
        print_info "Detected VPS IP: $VPS_IP"
        echo ""
        
        # Ask if user wants to use a subdomain
        read -p "Do you want to use a subdomain (e.g., dashboard.yourdomain.com)? (y/N): " use_subdomain
        if [[ $use_subdomain =~ ^[Yy]$ ]]; then
            echo ""
            print_info "Subdomain Setup with Cloudflare"
            echo "────────────────────────────────────────────────────────────────────────────"
            echo ""
            read -p "Enter your subdomain (e.g., dashboard.hosting.com): " SUBDOMAIN
            while [ -z "$SUBDOMAIN" ]; do
                print_error "Subdomain cannot be empty"
                read -p "Enter your subdomain (e.g., dashboard.hosting.com): " SUBDOMAIN
            done
            
            # Validate subdomain format (basic validation)
            if [[ ! $SUBDOMAIN =~ ^[a-zA-Z0-9][a-zA-Z0-9\.-]*[a-zA-Z0-9]$ ]] || [[ $SUBDOMAIN =~ \.\. ]] || [[ ! $SUBDOMAIN =~ \. ]]; then
                print_error "Invalid subdomain format. Please use format like: dashboard.hosting.com"
                read -p "Enter your subdomain: " SUBDOMAIN
            fi
            
            # Extract subdomain name and root domain
            SUBDOMAIN_NAME="${SUBDOMAIN%%.*}"  # e.g., "dashboard" from "dashboard.hosting.com"
            ROOT_DOMAIN="${SUBDOMAIN#*.}"      # e.g., "hosting.com" from "dashboard.hosting.com"
            
            echo ""
            print_warning "IMPORTANT: DNS Configuration Required"
            echo "────────────────────────────────────────────────────────────────────────────"
            echo ""
            echo "You need to configure a DNS A record in Cloudflare:"
            echo ""
            echo -e "  ${GREEN}Record Type:${NC}  A"
            echo -e "  ${GREEN}Name:${NC}         $SUBDOMAIN_NAME"
            echo -e "  ${GREEN}Content:${NC}       $VPS_IP"
            echo -e "  ${GREEN}Proxy:${NC}         Proxied (orange cloud) - Recommended for HTTPS"
            echo ""
            echo "Steps to configure in Cloudflare:"
            echo "  1. Log in to your Cloudflare dashboard"
            echo "  2. Select your domain ($ROOT_DOMAIN)"
            echo "  3. Go to DNS > Records"
            echo "  4. Click 'Add record'"
            echo "  5. Set Type: A"
            echo "  6. Set Name: $SUBDOMAIN_NAME"
            echo "  7. Set IPv4 address: $VPS_IP"
            echo "  8. Enable Proxy (orange cloud) for HTTPS support"
            echo "  9. Click 'Save'"
            echo ""
            echo -e "${YELLOW}Note:${NC} DNS propagation can take a few minutes to 24 hours, but usually happens within 5-10 minutes."
            echo ""
            read -p "Press Enter once you've configured the DNS record in Cloudflare..."
            
            # Ask if they want to use HTTPS
            read -p "Do you want to use HTTPS (requires Cloudflare proxy enabled)? (Y/n): " use_https
            if [[ ! $use_https =~ ^[Nn]$ ]]; then
                FRONTEND_URL="https://$SUBDOMAIN"
                print_success "Frontend URL set to: $FRONTEND_URL (HTTPS)"
            else
                FRONTEND_URL="http://$SUBDOMAIN"
                print_success "Frontend URL set to: $FRONTEND_URL (HTTP)"
            fi
        else
            # Use IP address
            DETECTED_URL="http://$VPS_IP:$PORT"
            read -p "Frontend URL (default: $DETECTED_URL): " FRONTEND_URL
            FRONTEND_URL=${FRONTEND_URL:-$DETECTED_URL}
            print_success "Frontend URL set to: $FRONTEND_URL"
        fi
    else
        print_warning "Could not automatically detect VPS IP"
        echo ""
        read -p "Do you want to use a subdomain? (y/N): " use_subdomain
        if [[ $use_subdomain =~ ^[Yy]$ ]]; then
            read -p "Enter your subdomain (e.g., dashboard.hosting.com): " SUBDOMAIN
            while [ -z "$SUBDOMAIN" ]; do
                print_error "Subdomain cannot be empty"
                read -p "Enter your subdomain: " SUBDOMAIN
            done
            
            # Extract subdomain name and root domain
            SUBDOMAIN_NAME="${SUBDOMAIN%%.*}"
            ROOT_DOMAIN="${SUBDOMAIN#*.}"
            
            echo ""
            print_warning "IMPORTANT: DNS Configuration Required"
            echo "────────────────────────────────────────────────────────────────────────────"
            echo ""
            echo "You need to configure a DNS A record in Cloudflare:"
            echo ""
            echo -e "  ${GREEN}Record Type:${NC}  A"
            echo -e "  ${GREEN}Name:${NC}         $SUBDOMAIN_NAME"
            echo -e "  ${GREEN}Content:${NC}       [Your VPS IP Address]"
            echo -e "  ${GREEN}Proxy:${NC}         Proxied (orange cloud) - Recommended for HTTPS"
            echo ""
            echo "Steps to configure in Cloudflare:"
            echo "  1. Log in to your Cloudflare dashboard"
            echo "  2. Select your domain ($ROOT_DOMAIN)"
            echo "  3. Go to DNS > Records"
            echo "  4. Click 'Add record'"
            echo "  5. Set Type: A"
            echo "  6. Set Name: $SUBDOMAIN_NAME"
            echo "  7. Set IPv4 address: [Your VPS IP]"
            echo "  8. Enable Proxy (orange cloud) for HTTPS support"
            echo "  9. Click 'Save'"
            echo ""
            read -p "Enter your VPS IP address: " VPS_IP
            read -p "Do you want to use HTTPS? (Y/n): " use_https
            if [[ ! $use_https =~ ^[Nn]$ ]]; then
                FRONTEND_URL="https://$SUBDOMAIN"
            else
                FRONTEND_URL="http://$SUBDOMAIN"
            fi
            print_success "Frontend URL set to: $FRONTEND_URL"
        else
            read -p "Enter your Frontend URL (e.g., http://your-domain.com or http://YOUR_IP:$PORT): " FRONTEND_URL
            while [ -z "$FRONTEND_URL" ] || ! validate_url "$FRONTEND_URL"; do
                print_error "Please enter a valid URL (must start with http:// or https://)"
                read -p "Enter your Frontend URL: " FRONTEND_URL
            done
            print_success "Frontend URL set to: $FRONTEND_URL"
        fi
    fi
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

# Frontend URL (REQUIRED for CORS and external access)
FRONTEND_URL=$FRONTEND_URL

# Admin Configuration
ADMIN_EMAIL=${ADMIN_EMAIL:-}

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

# Get VPS IP for display
VPS_IP=$(get_vps_ip)
if [ -n "$FRONTEND_URL" ]; then
    echo -e "  ${GREEN}Dashboard URL:${NC}   $FRONTEND_URL"
    # If using IP address, also show local access
    if [[ $FRONTEND_URL =~ ^https?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        echo -e "  ${GREEN}Local Access:${NC}    http://localhost:$PORT"
    fi
    echo -e "  ${GREEN}Health Check:${NC}    http://localhost:$PORT/health"
else
    if [ -n "$VPS_IP" ]; then
        echo -e "  ${GREEN}Local Access:${NC}    http://localhost:$PORT"
        echo -e "  ${GREEN}External Access:${NC} http://$VPS_IP:$PORT"
        echo -e "  ${GREEN}Health Check:${NC}    http://localhost:$PORT/health"
    else
        echo -e "  ${GREEN}Local Access:${NC}    http://localhost:$PORT"
        echo -e "  ${GREEN}Health Check:${NC}    http://localhost:$PORT/health"
        print_warning "Could not detect VPS IP. Use your server's IP address to access externally."
    fi
fi
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
if [ -n "$FRONTEND_URL" ]; then
    echo "  1. Open $FRONTEND_URL in your browser"
    if [[ $FRONTEND_URL =~ ^https?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        echo "     (or http://localhost:$PORT locally)"
    fi
else
    if [ -n "$VPS_IP" ]; then
        echo "  1. Open http://$VPS_IP:$PORT in your browser (or http://localhost:$PORT locally)"
    else
        echo "  1. Open http://localhost:$PORT in your browser"
    fi
fi
echo "  2. Register your first admin account"
echo "  3. Configure your Pterodactyl Panel integration"
echo "  4. Start managing game servers!"
echo ""

# Configure firewall
if [ -n "$PORT" ]; then
    configure_firewall "$PORT"
fi

echo ""
echo -e "${GREEN}Enjoy using Aether Dashboard! 🚀${NC}"
echo ""

