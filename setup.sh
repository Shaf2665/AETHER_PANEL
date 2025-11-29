#!/bin/bash

# Aether Dashboard - User-Friendly Setup Script
# This script provides an easy way to install and configure Aether Dashboard

# Force immediate output flushing - critical for preventing hangs
# Ensure stdout and stderr are properly connected
# Use simple approach that works in all environments - no process substitution
# Process substitution can cause hangs, so we avoid it

# Script version
SCRIPT_VERSION="v2.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
DOCKER_COMPOSE_CMD=""
BACKUP_FILE=""

# ============================================================================
# Helper Functions
# ============================================================================

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

print_header() {
    echo -e "${CYAN}$1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

generate_secret() {
    # Use openssl if available, otherwise fallback to /dev/urandom
    if command_exists openssl; then
        openssl rand -base64 32 2>/dev/null | tr -d "=+/" | cut -c1-32 || \
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
    fi
}

validate_url() {
    if [[ $1 =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

validate_port() {
    if [[ $1 =~ ^[0-9]+$ ]] && [ "$1" -ge 1 ] && [ "$1" -le 65535 ]; then
        return 0
    else
        return 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    elif [ -f /etc/arch-release ]; then
        echo "arch"
    else
        echo "unknown"
    fi
}

get_vps_ip() {
    # Try multiple methods to get the public IP with timeouts to prevent hanging
    if command_exists curl; then
        IP=$(timeout 3 curl -s --max-time 3 https://api.ipify.org 2>/dev/null || \
             timeout 3 curl -s --max-time 3 https://ifconfig.me 2>/dev/null || \
             timeout 3 curl -s --max-time 3 https://icanhazip.com 2>/dev/null || true)
        if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ] && [ "$IP" != "" ]; then
            echo "$IP"
            return 0
        fi
    fi
    
    # Fallback to local network interfaces
    if command_exists ip; then
        IP=$(ip route get 8.8.8.8 2>/dev/null 2>&1 | awk '{print $7; exit}' | head -1)
        if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ] && [ "$IP" != "" ]; then
            echo "$IP"
            return 0
        fi
    fi
    
    # Last resort: check hostname -I
    if command_exists hostname; then
        IP=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ] && [ "$IP" != "" ]; then
            echo "$IP"
            return 0
        fi
    fi
    
    echo ""
    return 1
}

confirm_action() {
    local message=$1
    local default=${2:-"N"}
    
    if [ "$default" = "Y" ]; then
        prompt="(Y/n)"
    else
        prompt="(y/N)"
    fi
    
    # Force output flush before reading - ensure all previous output is visible
    sync 2>/dev/null || true
    
    # Display prompt to stderr (user-facing output) so it's always visible
    echo -n "$message $prompt: " >&2
    
    # Force flush the prompt immediately
    sync 2>/dev/null || true
    
    # Read from terminal directly - try /dev/tty first, fallback to stdin
    if [ -t 0 ] && [ -r /dev/tty ]; then
        read -r response </dev/tty
    else
        read -r response
    fi
    
    # Use default if empty response
    response=${response:-$default}
    
    # Echo the response to stderr for visibility (optional, for debugging)
    # echo "" >&2  # New line after response
    
    if [[ $response =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

flush_output() {
    # Force immediate output flush
    sync 2>/dev/null || true
    # Ensure stdout/stderr are properly connected
    exec >&1 2>&2
    # Try to flush any buffered output
    [ -t 1 ] && stty -echo 2>/dev/null || true
}

# ============================================================================
# Prerequisite Installation Functions
# ============================================================================

install_docker() {
    print_info "Installing Docker..."
    
    local OS=$(detect_os)
    
    case $OS in
        ubuntu|debian)
            print_info "Detected Ubuntu/Debian. Installing Docker..."
            if ! command_exists curl; then
                print_error "curl is required but not installed."
                return 1
            fi
            curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
            sh /tmp/get-docker.sh
            rm -f /tmp/get-docker.sh
            ;;
        centos|rhel|fedora)
            print_info "Detected CentOS/RHEL/Fedora. Installing Docker..."
            if ! command_exists curl; then
                print_error "curl is required but not installed."
                return 1
            fi
            curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
            sh /tmp/get-docker.sh
            rm -f /tmp/get-docker.sh
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
        systemctl start docker 2>/dev/null || true
        systemctl enable docker 2>/dev/null || true
    fi
    
    # Add current user to docker group (if not root)
    if [ "$EUID" -ne 0 ]; then
        print_info "Adding current user to docker group..."
        if command_exists usermod; then
            usermod -aG docker "$USER" 2>/dev/null || true
            print_warning "You may need to log out and log back in for group changes to take effect."
        fi
    fi
    
    # Wait for Docker to be ready
    sleep 3
    
    # Verify installation
    if docker --version >/dev/null 2>&1; then
        local DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
        print_success "Docker installed successfully (version: $DOCKER_VERSION)"
        return 0
    else
        print_error "Docker installation failed"
        return 1
    fi
}

install_docker_compose() {
    print_info "Installing Docker Compose..."
    
    local OS=$(detect_os)
    
    case $OS in
        ubuntu|debian)
            print_info "Installing Docker Compose plugin (v2) - Recommended..."
            if [ "$EUID" -eq 0 ]; then
                apt-get update -qq >/dev/null 2>&1
                # Remove old docker-compose v1 if installed
                apt-get remove -y docker-compose >/dev/null 2>&1 || true
                apt-get install -y docker-compose-plugin >/dev/null 2>&1
            else
                if command_exists sudo; then
                    sudo apt-get update -qq >/dev/null 2>&1
                    # Remove old docker-compose v1 if installed
                    sudo apt-get remove -y docker-compose >/dev/null 2>&1 || true
                    sudo apt-get install -y docker-compose-plugin >/dev/null 2>&1
                else
                    print_error "sudo is required but not installed."
                    return 1
                fi
            fi
            ;;
        centos|rhel|fedora)
            print_info "Installing Docker Compose plugin (v2) - Recommended..."
            if [ "$EUID" -eq 0 ]; then
                # Remove old docker-compose v1 if installed
                yum remove -y docker-compose >/dev/null 2>&1 || \
                dnf remove -y docker-compose >/dev/null 2>&1 || true
                yum install -y docker-compose-plugin >/dev/null 2>&1 || \
                dnf install -y docker-compose-plugin >/dev/null 2>&1
            else
                if command_exists sudo; then
                    # Remove old docker-compose v1 if installed
                    sudo yum remove -y docker-compose >/dev/null 2>&1 || \
                    sudo dnf remove -y docker-compose >/dev/null 2>&1 || true
                    sudo yum install -y docker-compose-plugin >/dev/null 2>&1 || \
                    sudo dnf install -y docker-compose-plugin >/dev/null 2>&1
                else
                    print_error "sudo is required but not installed."
                    return 1
                fi
            fi
            ;;
        arch)
            print_info "Installing Docker Compose plugin (v2)..."
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
            # Fallback: Install standalone docker-compose v2
            print_info "Installing standalone Docker Compose v2..."
            local COMPOSE_VERSION="v2.24.0"
            if command_exists curl; then
                curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
                    -o /usr/local/bin/docker-compose
                chmod +x /usr/local/bin/docker-compose
            else
                print_error "curl is required but not installed."
                return 1
            fi
            ;;
    esac
    
    # Verify installation - Test that it actually works
    sleep 2
    if docker compose version >/dev/null 2>&1; then
        if test_docker_compose "docker compose"; then
            local COMPOSE_VERSION=$(docker compose version | awk '{print $4}')
            print_success "Docker Compose installed successfully (version: $COMPOSE_VERSION) - v2 plugin"
            DOCKER_COMPOSE_CMD="docker compose"
            return 0
        fi
    fi
    
    # Fallback check for docker-compose v1 (should not happen with our installation)
    if command_exists docker-compose; then
        local test_result=$(test_docker_compose "docker-compose")
        local test_exit=$?
        
        if [ $test_exit -eq 0 ]; then
            local COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
            print_success "Docker Compose installed successfully (version: $COMPOSE_VERSION) - v1"
            DOCKER_COMPOSE_CMD="docker-compose"
            return 0
        elif [ $test_exit -eq 2 ]; then
            print_error "docker-compose v1 is incompatible with Python 3.12"
            print_info "Installing python3-distutils as workaround..."
            
            if [ "$EUID" -eq 0 ]; then
                apt-get install -y python3-distutils >/dev/null 2>&1
            else
                if command_exists sudo; then
                    sudo apt-get install -y python3-distutils >/dev/null 2>&1
                else
                    print_error "sudo is required but not installed."
                    return 1
                fi
            fi
            
            if test_docker_compose "docker-compose"; then
                local COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
                print_success "Docker Compose v1 now works with python3-distutils"
                DOCKER_COMPOSE_CMD="docker-compose"
                return 0
            fi
        fi
    fi
    
    print_error "Docker Compose installation failed or incompatible"
    return 1
}

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

# ============================================================================
# Prerequisite Checking Functions
# ============================================================================

test_docker_compose() {
    local cmd=$1
    
    # Test if the command actually works
    if [ "$cmd" = "docker compose" ]; then
        if docker compose version >/dev/null 2>&1; then
            return 0
        fi
        return 1
    elif [ "$cmd" = "docker-compose" ]; then
        # Test docker-compose v1 - it might fail with distutils error
        local output=$(docker-compose --version 2>&1)
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            return 0
        fi
        
        # Check for distutils error (Python 3.12 compatibility issue)
        if echo "$output" | grep -q "ModuleNotFoundError: No module named 'distutils'"; then
            print_error "docker-compose v1 is incompatible with Python 3.12 (distutils removed)"
            print_warning "docker-compose v1 requires distutils which was removed in Python 3.12"
            echo ""
            print_info "Solutions:"
            echo "  1. Install docker-compose-plugin (v2) - Recommended"
            echo "  2. Install python3-distutils as a workaround for v1"
            echo ""
            return 2  # Special return code for distutils error
        fi
        
        return 1
    fi
    
    return 1
}

check_prerequisites() {
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    print_header "Checking Prerequisites" >&2
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    
    # Check Docker
    if command_exists docker; then
        local DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
        print_success "Docker is installed (version: $DOCKER_VERSION)" >&2
    else
        print_error "Docker is not installed" >&2
        echo "" >&2
        
        # Force flush before showing prompt
        sync 2>/dev/null || true
        
        if confirm_action "Do you want to install Docker automatically?" "Y"; then
            if install_docker; then
                print_success "Docker installation completed" >&2
            else
                print_error "Docker installation failed. Please install manually:" >&2
                echo "  - Linux: https://docs.docker.com/engine/install/" >&2
                return 1
            fi
        else
            print_error "Docker is required. Please install it first." >&2
            return 1
        fi
    fi
    
    # Check Docker Compose - Prefer v2 plugin over v1
    local compose_available=false
    local compose_cmd=""
    
    # First, try docker compose (v2 plugin)
    if docker compose version >/dev/null 2>&1; then
        if test_docker_compose "docker compose"; then
            local COMPOSE_VERSION=$(docker compose version | awk '{print $4}')
            print_success "Docker Compose is installed (version: $COMPOSE_VERSION) - v2 plugin" >&2
            DOCKER_COMPOSE_CMD="docker compose"
            compose_available=true
        fi
    fi
    
    # If v2 not available, try docker-compose (v1)
    if [ "$compose_available" = false ] && command_exists docker-compose; then
        local test_result=$(test_docker_compose "docker-compose")
        local test_exit=$?
        
        if [ $test_exit -eq 0 ]; then
            local COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
            print_success "Docker Compose is installed (version: $COMPOSE_VERSION) - v1" >&2
            DOCKER_COMPOSE_CMD="docker-compose"
            compose_available=true
        elif [ $test_exit -eq 2 ]; then
            # distutils error detected
            echo "" >&2
            print_warning "docker-compose v1 is installed but incompatible with Python 3.12" >&2
            echo "" >&2
            
            # Force flush before showing prompt
            sync 2>/dev/null || true
            
            if confirm_action "Do you want to install docker-compose-plugin (v2) instead? (Recommended)" "Y"; then
                # Remove old docker-compose v1
                if [ "$EUID" -eq 0 ]; then
                    apt-get remove -y docker-compose >/dev/null 2>&1 || true
                else
                    if command_exists sudo; then
                        sudo apt-get remove -y docker-compose >/dev/null 2>&1 || true
                    fi
                fi
                
                if install_docker_compose; then
                    print_success "Docker Compose v2 installed successfully" >&2
                    compose_available=true
                else
                    print_error "Failed to install docker-compose-plugin" >&2
                    echo "" >&2
                    
                    # Force flush before showing prompt
                    sync 2>/dev/null || true
                    
                    if confirm_action "Install python3-distutils as a workaround for docker-compose v1?" "N"; then
                        if [ "$EUID" -eq 0 ]; then
                            apt-get install -y python3-distutils >/dev/null 2>&1
                        else
                            if command_exists sudo; then
                                sudo apt-get install -y python3-distutils >/dev/null 2>&1
                            fi
                        fi
                        if test_docker_compose "docker-compose"; then
                            DOCKER_COMPOSE_CMD="docker-compose"
                            compose_available=true
                        fi
                    fi
                fi
            else
                # Force flush before showing prompt
                sync 2>/dev/null || true
                
                if confirm_action "Install python3-distutils as a workaround?" "N"; then
                    if [ "$EUID" -eq 0 ]; then
                        apt-get install -y python3-distutils >/dev/null 2>&1
                    else
                        if command_exists sudo; then
                            sudo apt-get install -y python3-distutils >/dev/null 2>&1
                        fi
                    fi
                    if test_docker_compose "docker-compose"; then
                        local COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
                        print_success "Docker Compose v1 now works with python3-distutils" >&2
                        DOCKER_COMPOSE_CMD="docker-compose"
                        compose_available=true
                    fi
                else
                    print_error "Docker Compose is required but not working." >&2
                    print_info "Please install docker-compose-plugin manually:" >&2
                    echo "  apt-get install docker-compose-plugin" >&2
                    return 1
                fi
            fi
        else
            # test_exit is neither 0 nor 2
            print_error "Unexpected error testing docker-compose" >&2
            return 1
        fi
    fi
    
    if [ "$compose_available" = false ]; then
        print_error "Docker Compose is not installed" >&2
        echo "" >&2
        
        # Force flush before showing prompt
        sync 2>/dev/null || true
        
        if confirm_action "Do you want to install Docker Compose automatically?" "Y"; then
            if install_docker_compose; then
                print_success "Docker Compose installation completed" >&2
            else
                print_error "Docker Compose installation failed. Please install manually:" >&2
                echo "  https://docs.docker.com/compose/install/" >&2
                return 1
            fi
        else
            print_error "Docker Compose is required. Please install it first." >&2
            return 1
        fi
    fi
    
    # Check if Docker is running
    if docker info >/dev/null 2>&1; then
        print_success "Docker daemon is running" >&2
    else
        print_error "Docker daemon is not running" >&2
        echo "" >&2
        
        # Force flush before showing prompt
        sync 2>/dev/null || true
        
        if confirm_action "Do you want to start Docker daemon automatically?" "Y"; then
            if start_docker_daemon; then
                print_success "Docker daemon started" >&2
            else
                print_error "Failed to start Docker daemon. Please start manually and try again." >&2
                return 1
            fi
        else
            print_error "Docker daemon must be running. Please start it and try again." >&2
            return 1
        fi
    fi
    
    echo "" >&2
    return 0
}

install_prerequisites() {
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Install Prerequisites"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    check_prerequisites
}

# ============================================================================
# Configuration Functions
# ============================================================================

create_configuration() {
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Configuration Wizard"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Check if .env already exists
    if [ -f .env ]; then
        print_warning "A .env file already exists!"
        echo ""
        if ! confirm_action "Do you want to overwrite it?" "N"; then
            print_info "Keeping existing .env file"
            SKIP_ENV_CREATION=true
            return 0
        fi
        # Create backup
        BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env "$BACKUP_FILE" 2>/dev/null && \
            print_success "Backup created: $BACKUP_FILE" || \
            print_warning "Could not create backup"
        echo ""
    fi
    
    SKIP_ENV_CREATION=false
    
    print_info "We'll ask you a few questions to configure Aether Dashboard"
    echo ""
    
    # Server Configuration
    print_header "Server Configuration"
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
    print_header "Frontend URL Configuration"
    echo "────────────────────────────────────────────────────────────────────────────"
    print_info "This is required for CORS and external access. We'll try to detect your VPS IP automatically."
    
    local VPS_IP=$(get_vps_ip)
    if [ -n "$VPS_IP" ]; then
        print_info "Detected VPS IP: $VPS_IP"
        echo ""
        
        # Ask if user wants to use a subdomain
        if confirm_action "Do you want to use a subdomain (e.g., dashboard.yourdomain.com)?" "N"; then
            echo ""
            print_info "Subdomain Setup with Cloudflare"
            echo "────────────────────────────────────────────────────────────────────────────"
            echo ""
            read -p "Enter your subdomain (e.g., dashboard.hosting.com): " SUBDOMAIN
            while [ -z "$SUBDOMAIN" ]; do
                print_error "Subdomain cannot be empty"
                read -p "Enter your subdomain: " SUBDOMAIN
            done
            
            # Validate subdomain format
            if [[ ! $SUBDOMAIN =~ ^[a-zA-Z0-9][a-zA-Z0-9\.-]*[a-zA-Z0-9]$ ]] || [[ $SUBDOMAIN =~ \.\. ]] || [[ ! $SUBDOMAIN =~ \. ]]; then
                print_error "Invalid subdomain format. Please use format like: dashboard.hosting.com"
                read -p "Enter your subdomain: " SUBDOMAIN
            fi
            
            local SUBDOMAIN_NAME="${SUBDOMAIN%%.*}"
            local ROOT_DOMAIN="${SUBDOMAIN#*.}"
            
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
            echo -e "${YELLOW}Note:${NC} DNS propagation can take a few minutes to 24 hours."
            echo ""
            read -p "Press Enter once you've configured the DNS record..."
            
            # Ask if they want to use HTTPS
            if confirm_action "Do you want to use HTTPS (requires Cloudflare proxy enabled)?" "Y"; then
                FRONTEND_URL="https://$SUBDOMAIN"
                print_success "Frontend URL set to: $FRONTEND_URL (HTTPS)"
            else
                FRONTEND_URL="http://$SUBDOMAIN"
                print_success "Frontend URL set to: $FRONTEND_URL (HTTP)"
            fi
        else
            # Use IP address
            local DETECTED_URL="http://$VPS_IP:$PORT"
            read -p "Frontend URL (default: $DETECTED_URL): " FRONTEND_URL
            FRONTEND_URL=${FRONTEND_URL:-$DETECTED_URL}
            print_success "Frontend URL set to: $FRONTEND_URL"
        fi
    else
        print_warning "Could not automatically detect VPS IP"
        echo ""
        if confirm_action "Do you want to use a subdomain?" "N"; then
            read -p "Enter your subdomain (e.g., dashboard.hosting.com): " SUBDOMAIN
            while [ -z "$SUBDOMAIN" ]; do
                print_error "Subdomain cannot be empty"
                read -p "Enter your subdomain: " SUBDOMAIN
            done
            
            local SUBDOMAIN_NAME="${SUBDOMAIN%%.*}"
            local ROOT_DOMAIN="${SUBDOMAIN#*.}"
            
            echo ""
            print_warning "IMPORTANT: DNS Configuration Required"
            echo "────────────────────────────────────────────────────────────────────────────"
            echo ""
            echo "You need to configure a DNS A record in Cloudflare pointing to your VPS IP."
            echo ""
            read -p "Enter your VPS IP address: " VPS_IP
            if confirm_action "Do you want to use HTTPS?" "Y"; then
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
    print_header "Security Configuration"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    if confirm_action "Generate a secure JWT secret automatically?" "Y"; then
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
    
    # Admin Email Configuration
    print_header "Admin Configuration"
    echo "────────────────────────────────────────────────────────────────────────────"
    print_info "Enter the email address that should be assigned admin role automatically"
    echo ""
    read -p "Admin Email (optional, press Enter to skip): " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-}
    if [ -n "$ADMIN_EMAIL" ]; then
        print_success "Admin email set to: $ADMIN_EMAIL"
    else
        print_info "No admin email configured. You can set it later in the .env file."
    fi
    echo ""
    
    # Database Configuration
    print_header "Database Configuration"
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
    print_header "Redis Configuration"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    if confirm_action "Enable Redis?" "Y"; then
        REDIS_ENABLED="true"
        read -sp "Redis password (optional, press Enter to skip): " REDIS_PASSWORD
        echo ""
        REDIS_PASSWORD=${REDIS_PASSWORD:-}
        print_success "Redis enabled"
    else
        REDIS_ENABLED="false"
        REDIS_PASSWORD=""
        print_info "Redis disabled"
    fi
    echo ""
    
    # Pterodactyl Configuration
    print_header "Pterodactyl Panel Configuration"
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
    print_header "Revenue System Configuration"
    echo "────────────────────────────────────────────────────────────────────────────"
    print_info "Configure coin earning methods (press Enter for defaults)"
    echo ""
    
    if confirm_action "Enable Linkvertise?" "Y"; then
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
    
    if confirm_action "Enable AFK page?" "Y"; then
        AFK_ENABLED="true"
    else
        AFK_ENABLED="false"
    fi
    
    if confirm_action "Enable Surveys?" "Y"; then
        SURVEYS_ENABLED="true"
    else
        SURVEYS_ENABLED="false"
    fi
    
    if confirm_action "Enable Ads?" "Y"; then
        ADS_ENABLED="true"
    else
        ADS_ENABLED="false"
    fi
    
    if confirm_action "Enable Referral system?" "Y"; then
        REFERRAL_ENABLED="true"
    else
        REFERRAL_ENABLED="false"
    fi
    
    if confirm_action "Enable Daily login bonus?" "Y"; then
        DAILY_LOGIN_ENABLED="true"
    else
        DAILY_LOGIN_ENABLED="false"
    fi
    
    print_success "Revenue system configuration set"
    echo ""
    
    # Create .env file
    print_header "Creating Configuration File"
    echo "────────────────────────────────────────────────────────────────────────────"
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
}

# ============================================================================
# Build and Start Functions
# ============================================================================

build_and_start() {
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Building and Starting Services"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [ ! -f .env ]; then
        print_error ".env file not found. Please run 'Configuration Only' first."
        return 1
    fi
    
    # Verify docker-compose command works before using it
    if [ -z "$DOCKER_COMPOSE_CMD" ]; then
        print_error "Docker Compose command not set. Please run prerequisite check first."
        return 1
    fi
    
    # Test the command one more time before using it
    if ! test_docker_compose "$DOCKER_COMPOSE_CMD" >/dev/null 2>&1; then
        print_error "Docker Compose command is not working: $DOCKER_COMPOSE_CMD"
        print_info "Please run 'Install Prerequisites Only' to fix this issue."
        return 1
    fi
    
    print_info "Building Docker images..."
    if $DOCKER_COMPOSE_CMD build; then
        print_success "Docker images built successfully"
    else
        print_error "Failed to build Docker images"
        return 1
    fi
    
    echo ""
    print_info "Starting services..."
    if $DOCKER_COMPOSE_CMD up -d; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services"
        return 1
    fi
    
    echo ""
    print_info "Waiting for services to be ready..."
    sleep 5
}

# ============================================================================
# Migration Functions
# ============================================================================

run_migrations() {
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Running Database Migrations"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [ ! -f .env ]; then
        print_error ".env file not found. Please run configuration first."
        return 1
    fi
    
    # Verify docker-compose command works
    if [ -z "$DOCKER_COMPOSE_CMD" ]; then
        print_error "Docker Compose command not set. Please run prerequisite check first."
        return 1
    fi
    
    print_info "Waiting for database to be ready..."
    
    # Wait for database with retries
    local db_ready=false
    for i in {1..30}; do
        if $DOCKER_COMPOSE_CMD exec -T aether-postgres pg_isready -U postgres >/dev/null 2>&1; then
            db_ready=true
            break
        fi
        printf "\rWaiting for database... (attempt $i/30) "
        sleep 2
    done
    printf "\r"
    
    if [ "$db_ready" = false ]; then
        print_error "Database is not ready after 60 seconds"
        return 1
    fi
    
    print_success "Database is ready"
    sleep 2
    
    print_info "Running database migrations..."
    
    if $DOCKER_COMPOSE_CMD exec -T aether-dashboard npm run migrate >/dev/null 2>&1; then
        print_success "Database migrations completed"
        return 0
    else
        print_warning "Migration command returned an error, but this might be normal if migrations already ran"
        return 0  # Don't fail if migrations already ran
    fi
}

# ============================================================================
# Verification Functions
# ============================================================================

verify_installation() {
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Verifying Installation"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Verify docker-compose command works
    if [ -z "$DOCKER_COMPOSE_CMD" ]; then
        print_error "Docker Compose command not set. Please run prerequisite check first."
        return 1
    fi
    
    print_info "Checking service status..."
    
    # Check services status
    local services=("aether-dashboard" "aether-postgres" "aether-redis")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        if $DOCKER_COMPOSE_CMD ps 2>/dev/null | grep -q "$service.*Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            all_healthy=false
        fi
    done
    
    echo ""
    
    # Health check with retries
    local PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "5000")
    PORT=${PORT:-5000}
    
    print_info "Testing health endpoint..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
            print_success "Aether Dashboard is running and healthy!"
            return 0
        fi
        if [ $attempt -lt $max_attempts ]; then
            printf "\rWaiting for service... (attempt $attempt/$max_attempts) "
            sleep 2
        fi
        attempt=$((attempt + 1))
    done
    
    printf "\r"
    if [ "$all_healthy" = true ]; then
        print_warning "Health check failed, but services appear to be running"
        print_info "Wait a few more seconds and check: http://localhost:$PORT/health"
        return 0
    else
        print_error "Some services failed to start"
        return 1
    fi
}

# ============================================================================
# Summary Functions
# ============================================================================

show_summary() {
    echo ""
    print_header "╔══════════════════════════════════════════════════════════╗"
    print_header "║              Installation Complete! 🎉                  ║"
    print_header "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Installation Summary"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "  ${BLUE}Configuration File:${NC}  .env"
    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
        echo -e "  ${BLUE}Backup File:${NC}          $BACKUP_FILE"
    fi
    echo ""
    
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Access Your Aether Dashboard"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    local FRONTEND_URL=$(grep "^FRONTEND_URL=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "")
    local PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "5000")
    PORT=${PORT:-5000}
    
    if [ -n "$FRONTEND_URL" ]; then
        echo -e "  ${GREEN}Dashboard URL:${NC}   $FRONTEND_URL"
        if [[ $FRONTEND_URL =~ ^https?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ ]]; then
            echo -e "  ${GREEN}Local Access:${NC}    http://localhost:$PORT"
        fi
    else
        local VPS_IP=$(get_vps_ip)
        if [ -n "$VPS_IP" ]; then
            echo -e "  ${GREEN}Local Access:${NC}    http://localhost:$PORT"
            echo -e "  ${GREEN}External Access:${NC} http://$VPS_IP:$PORT"
        else
            echo -e "  ${GREEN}Local Access:${NC}    http://localhost:$PORT"
        fi
    fi
    echo -e "  ${GREEN}Health Check:${NC}    http://localhost:$PORT/health"
    echo ""
    
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Useful Commands"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  View logs:        $DOCKER_COMPOSE_CMD logs -f aether-dashboard"
    echo "  Stop services:    $DOCKER_COMPOSE_CMD down"
    echo "  Restart:          $DOCKER_COMPOSE_CMD restart"
    echo "  View status:      $DOCKER_COMPOSE_CMD ps"
    echo ""
    
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "Next Steps"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    if [ -n "$FRONTEND_URL" ]; then
        echo "  1. Open $FRONTEND_URL in your browser"
    else
        echo "  1. Open http://localhost:$PORT in your browser"
    fi
    echo "  2. Register your first admin account"
    echo "  3. Configure your Pterodactyl Panel integration"
    echo "  4. Start managing game servers!"
    echo ""
    echo -e "${GREEN}Enjoy using Aether Dashboard! 🚀${NC}"
    echo ""
}

# ============================================================================
# Menu Functions
# ============================================================================

show_menu() {
    # Don't use clear - it can hang in some environments
    # Instead, print a separator line if we have a TTY
    if [ -t 1 ]; then
        # Print separator instead of clearing screen
        echo "" >&2
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
        echo "" >&2
    fi
    
    # Output menu to stderr so it's not captured by command substitution
    # Only the action choice will go to stdout
    echo -e "${BLUE}" >&2
    echo "╔══════════════════════════════════════════════════════════╗" >&2
    echo "║      Aether Dashboard - Setup Wizard                    ║" >&2
    echo "║                    Version $SCRIPT_VERSION                    ║" >&2
    echo "╚══════════════════════════════════════════════════════════╝" >&2
    echo -e "${NC}" >&2
    echo "" >&2
    print_info "Welcome to Aether Dashboard installation!" >&2
    echo "" >&2
    
    # Force flush output immediately
    sync 2>/dev/null || true
    
    # Check if we have an interactive terminal
    if [ ! -t 0 ]; then
        print_error "This script requires an interactive terminal" >&2
        exit 1
    fi
    
    echo "What would you like to do?" >&2
    echo "" >&2
    echo -e "  [${GREEN}1${NC}] Install Prerequisites Only (Docker & Docker Compose)" >&2
    echo -e "  [${GREEN}2${NC}] Full Installation (Recommended)" >&2
    echo -e "  [${GREEN}3${NC}] Configuration Only (Create .env file)" >&2
    echo -e "  [${GREEN}4${NC}] Build & Start Services" >&2
    echo -e "  [${GREEN}5${NC}] Run Database Migrations" >&2
    echo -e "  [${GREEN}6${NC}] Verify Installation" >&2
    echo -e "  [${GREEN}7${NC}] Exit" >&2
    echo "" >&2
    
    # Force output flush before reading
    sync 2>/dev/null || true
    
    # Use explicit prompt with -p flag for better compatibility
    # Read from terminal directly, output prompt to stderr
    read -r -p "Enter your choice [1-7]: " choice </dev/tty 2>/dev/null || read -r -p "Enter your choice [1-7]: " choice
    
    # Output choice to stdout (for command substitution) and error messages to stderr
    case $choice in
        1) echo "prerequisites" ;;
        2) echo "full" ;;
        3) echo "config" ;;
        4) echo "build" ;;
        5) echo "migrate" ;;
        6) echo "verify" ;;
        7) echo "exit" ;;
        *)
            print_error "Invalid choice" >&2
            return 1
            ;;
    esac
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    # Force output immediately to stderr (user-facing output)
    echo "" >&2
    sync 2>/dev/null || true
    
    # Capture only the action choice from stdout
    local action=$(show_menu)
    
    if [ -z "$action" ]; then
        print_error "Invalid selection" >&2
        exit 1
    fi
    
    case $action in
        "prerequisites")
            install_prerequisites
            ;;
        "full")
            check_prerequisites || exit 1
            create_configuration
            build_and_start || exit 1
            run_migrations
            verify_installation
            show_summary
            ;;
        "config")
            check_prerequisites || exit 1
            create_configuration
            print_success "Configuration completed!"
            echo ""
            echo "Next steps:"
            echo "  1. Review the .env file"
            echo "  2. Run the script again and select 'Build & Start Services'"
            ;;
        "build")
            check_prerequisites || exit 1
            build_and_start
            ;;
        "migrate")
            check_prerequisites || exit 1
            run_migrations
            ;;
        "verify")
            check_prerequisites || exit 1
            verify_installation
            ;;
        "exit")
            print_info "Exiting installer"
            exit 0
            ;;
        *)
            print_error "Unknown action: $action" >&2
            exit 1
            ;;
    esac
}

# Run main function
main

