#!/bin/bash

# Aether Dashboard - Interactive Setup Wizard
# This script guides you through the installation and configuration process

set -e

# Script version
export SCRIPT_VERSION="v1.8.0"
export GITHUB_REPO="Shaf2665/AETHER_DASHBOARD"

# Logging
LOG_PATH="/var/log/aether-dashboard-installer.log"
BACKUP_FILE=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize log file
mkdir -p "$(dirname "$LOG_PATH")" 2>/dev/null || true
echo -e "\n\n* Aether Dashboard Installer $(date) - Version $SCRIPT_VERSION \n\n" >> "$LOG_PATH"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_PATH"
}

# Banner
welcome() {
    clear
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      Aether Dashboard - Interactive Setup Wizard       ║"
    echo "║                    Version $SCRIPT_VERSION                    ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    print_info "Welcome to Aether Dashboard installation!"
    echo ""
    log_message "Installation started"
}

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
    log_message "SUCCESS: $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    log_message "ERROR: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    log_message "WARNING: $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
    log_message "INFO: $1"
}

output() {
    echo -e "$1"
    log_message "$1"
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

# Function to show progress indicator
show_progress() {
    local pid=$1
    local message=$2
    local spin='-\|/'
    local i=0
    
    echo -n "$message "
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) %4 ))
        printf "\r$message ${spin:$i:1}"
        sleep 0.1
    done
    printf "\r$message ✓\n"
}

# Function to retry command with exponential backoff
retry_command() {
    local max_attempts=$1
    local delay=$2
    shift 2
    local command=("$@")
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if "${command[@]}" >> "$LOG_PATH" 2>&1; then
            return 0
        fi
        if [ $attempt -lt $max_attempts ]; then
            print_warning "Attempt $attempt failed. Retrying in ${delay}s..."
            sleep $delay
            delay=$((delay * 2))  # Exponential backoff
        fi
        attempt=$((attempt + 1))
    done
    
    print_error "Command failed after $max_attempts attempts"
    return 1
}

# Function to wait for service health with retries
wait_for_health() {
    local url=$1
    local max_attempts=30
    local attempt=1
    local delay=2
    
    print_info "Waiting for service to be healthy..."
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            print_success "Service is healthy!"
            return 0
        fi
        if [ $attempt -lt $max_attempts ]; then
            printf "\rWaiting... (attempt $attempt/$max_attempts) "
            sleep $delay
            if [ $delay -lt 10 ]; then
                delay=$((delay + 1))  # Exponential backoff up to 10s
            fi
        fi
        attempt=$((attempt + 1))
    done
    
    printf "\r"
    print_error "Service health check failed after $max_attempts attempts"
    return 1
}

# Function to confirm action
confirm_action() {
    local message=$1
    local default=${2:-"N"}
    
    if [ "$default" = "Y" ]; then
        prompt="(Y/n)"
    else
        prompt="(y/N)"
    fi
    
    read -p "$message $prompt: " response
    response=${response:-$default}
    
    if [[ $response =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to create backup
create_backup() {
    if [ -f .env ]; then
        BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env "$BACKUP_FILE" 2>/dev/null && print_success "Configuration backed up to $BACKUP_FILE" || print_warning "Could not create backup"
        log_message "Backup created: $BACKUP_FILE"
    fi
}

# Function for pre-flight checks
preflight_checks() {
    print_info "Running pre-flight checks..."
    log_message "Starting pre-flight checks"
    local errors=0
    
    # Check disk space (need at least 5GB)
    if command_exists df; then
        available_space=$(df -BG . 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/G//' || echo "0")
        if [ -n "$available_space" ] && [ "$available_space" -lt 5 ] 2>/dev/null; then
            print_error "Insufficient disk space. Need at least 5GB, have ${available_space}GB"
            errors=$((errors + 1))
        else
            print_success "Disk space check passed (${available_space}GB available)"
        fi
    fi
    
    # Check memory (warn if less than 2GB)
    if command_exists free; then
        total_mem=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo "0")
        if [ -n "$total_mem" ] && [ "$total_mem" -lt 2 ] 2>/dev/null; then
            print_warning "Low memory detected (${total_mem}GB). Recommended: 2GB+"
        else
            print_success "Memory check passed (${total_mem}GB available)"
        fi
    fi
    
    # Check if ports are available (if PORT is set)
    if [ -n "$PORT" ]; then
        if command_exists netstat; then
            if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
                print_error "Port $PORT is already in use"
                errors=$((errors + 1))
            else
                print_success "Port $PORT is available"
            fi
        elif command_exists ss; then
            if ss -tuln 2>/dev/null | grep -q ":$PORT "; then
                print_error "Port $PORT is already in use"
                errors=$((errors + 1))
            else
                print_success "Port $PORT is available"
            fi
        fi
    fi
    
    if [ $errors -gt 0 ]; then
        print_error "Pre-flight checks failed. Please fix the errors above."
        log_message "Pre-flight checks failed with $errors errors"
        return 1
    fi
    
    print_success "All pre-flight checks passed"
    log_message "Pre-flight checks passed"
    return 0
}

# Function to validate configuration
validate_configuration() {
    print_info "Validating configuration..."
    log_message "Starting configuration validation"
    local errors=0
    
    if [ -z "$FRONTEND_URL" ]; then
        print_error "FRONTEND_URL is required"
        errors=$((errors + 1))
    elif ! validate_url "$FRONTEND_URL"; then
        print_error "FRONTEND_URL must be a valid URL (http:// or https://)"
        errors=$((errors + 1))
    fi
    
    if [ ${#JWT_SECRET} -lt 32 ]; then
        print_error "JWT_SECRET must be at least 32 characters"
        errors=$((errors + 1))
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        print_error "Database password is required"
        errors=$((errors + 1))
    fi
    
    if [ -z "$PTERODACTYL_URL" ]; then
        print_error "Pterodactyl Panel URL is required"
        errors=$((errors + 1))
    elif ! validate_url "$PTERODACTYL_URL"; then
        print_error "Pterodactyl URL must be a valid URL"
        errors=$((errors + 1))
    fi
    
    if [ -z "$PTERODACTYL_APPLICATION_API_KEY" ]; then
        print_error "Pterodactyl Application API Key is required"
        errors=$((errors + 1))
    fi
    
    if [ $errors -gt 0 ]; then
        print_error "Configuration validation failed. Please fix the $errors error(s) above."
        log_message "Configuration validation failed with $errors errors"
        return 1
    fi
    
    print_success "Configuration validation passed"
    log_message "Configuration validation passed"
    return 0
}

# Function to check services status
check_services_status() {
    print_info "Checking service status..."
    echo ""
    log_message "Checking service status"
    
    services=("aether-dashboard" "aether-postgres" "aether-redis")
    all_healthy=true
    
    for service in "${services[@]}"; do
        if $DOCKER_COMPOSE_CMD ps 2>/dev/null | grep -q "$service.*Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        log_message "All services are running"
        return 0
    else
        print_warning "Some services are not running. Check logs: $DOCKER_COMPOSE_CMD logs"
        log_message "Some services failed to start"
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

# Function to show menu
show_menu() {
    welcome
    
    options=(
        "Full Installation (Recommended - Configure, Build, Start, Migrate, Verify)"
        "Configuration Only (Create .env file, skip Docker operations)"
        "Build and Start Services Only (Skip configuration)"
        "Run Database Migrations Only"
        "Verify Installation (Check service status and health)"
        "Exit"
    )
    
    actions=(
        "full"
        "config"
        "build"
        "migrate"
        "verify"
        "exit"
    )
    
    output "What would you like to do?"
    echo ""
    for i in "${!options[@]}"; do
        echo -e "  [${GREEN}$i${NC}] ${options[$i]}"
    done
    echo ""
    echo -n "* Input 0-$((${#actions[@]} - 1)): "
    read -r action
    
    [ -z "$action" ] && error "Input is required" && return 1
    
    valid_input=("$(for ((i = 0; i <= ${#actions[@]} - 1; i += 1)); do echo "${i}"; done)")
    [[ ! " ${valid_input[*]} " =~ ${action} ]] && print_error "Invalid option" && return 1
    
    if [[ " ${valid_input[*]} " =~ ${action} ]]; then
        echo "${actions[$action]}"
        return 0
    fi
    
    return 1
}

# Main execution function
execute() {
    local action=$1
    
    case $action in
        "full")
            log_message "Starting full installation"
            # Run all steps
            check_prerequisites
            create_configuration
            if [ "$SKIP_ENV_CREATION" != "true" ]; then
                if ! validate_configuration; then
                    print_error "Configuration validation failed. Please fix the errors and try again."
                    exit 1
                fi
            fi
            create_backup
            if ! preflight_checks; then
                print_error "Pre-flight checks failed. Please fix the issues and try again."
                exit 1
            fi
            execute_build_and_start
            run_migrations
            verify_installation
            show_final_summary
            ;;
        "config")
            log_message "Starting configuration only"
            check_prerequisites
            create_configuration
            if [ "$SKIP_ENV_CREATION" != "true" ]; then
                validate_configuration
            fi
            create_backup
            print_success "Configuration completed!"
            echo ""
            echo "Next steps:"
            echo "  1. Review the .env file"
            echo "  2. Run the script again and select 'Build and Start Services'"
            ;;
        "build")
            log_message "Starting build and start services"
            check_prerequisites
            if [ ! -f .env ]; then
                print_error ".env file not found. Please run 'Configuration Only' first."
                exit 1
            fi
            execute_build_and_start
            ;;
        "migrate")
            log_message "Running migrations only"
            check_prerequisites
            if [ ! -f .env ]; then
                print_error ".env file not found. Please run configuration first."
                exit 1
            fi
            run_migrations
            ;;
        "verify")
            log_message "Verifying installation"
            check_prerequisites
            verify_installation
            ;;
        "exit")
            print_info "Exiting installer"
            exit 0
            ;;
        *)
            print_error "Unknown action: $action"
            exit 1
            ;;
    esac
}

# Function to check prerequisites (extracted from main flow)
check_prerequisites() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Checking Prerequisites${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    log_message "Checking prerequisites"

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
}

# Main execution function
execute() {
    local action=$1
    
    case $action in
        "full")
            log_message "Starting full installation"
            # Run all steps
            check_prerequisites
            create_configuration
            if [ "$SKIP_ENV_CREATION" != "true" ]; then
                if ! validate_configuration; then
                    print_error "Configuration validation failed. Please fix the errors and try again."
                    exit 1
                fi
            fi
            create_backup
            if ! preflight_checks; then
                print_error "Pre-flight checks failed. Please fix the issues and try again."
                exit 1
            fi
            execute_build_and_start
            run_migrations
            verify_installation
            show_final_summary
            ;;
        "config")
            log_message "Starting configuration only"
            check_prerequisites
            create_configuration
            if [ "$SKIP_ENV_CREATION" != "true" ]; then
                validate_configuration
            fi
            create_backup
            print_success "Configuration completed!"
            echo ""
            echo "Next steps:"
            echo "  1. Review the .env file"
            echo "  2. Run the script again and select 'Build and Start Services'"
            ;;
        "build")
            log_message "Starting build and start services"
            check_prerequisites
            if [ ! -f .env ]; then
                print_error ".env file not found. Please run 'Configuration Only' first."
                exit 1
            fi
            execute_build_and_start
            ;;
        "migrate")
            log_message "Running migrations only"
            check_prerequisites
            if [ ! -f .env ]; then
                print_error ".env file not found. Please run configuration first."
                exit 1
            fi
            run_migrations
            ;;
        "verify")
            log_message "Verifying installation"
            check_prerequisites
            verify_installation
            ;;
        "exit")
            print_info "Exiting installer"
            exit 0
            ;;
        *)
            print_error "Unknown action: $action"
            exit 1
            ;;
    esac
}

# Function to show final summary
show_final_summary() {
    show_installation_summary

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

# Function to run migrations
run_migrations() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Setting Up Database${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    print_info "Waiting for database to be ready..."
    log_message "Waiting for database to be ready"
    
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
        log_message "Database readiness check failed"
        return 1
    fi
    
    print_success "Database is ready"
    sleep 2
    
    print_info "Running database migrations..."
    log_message "Running database migrations"
    
    if retry_command 3 5 $DOCKER_COMPOSE_CMD exec -T aether-dashboard npm run migrate; then
        print_success "Database migrations completed"
        log_message "Database migrations completed successfully"
        return 0
    else
        print_warning "Migration command returned an error, but this might be normal if migrations already ran"
        log_message "Migration command had issues (may be normal if already migrated)"
        return 0  # Don't fail if migrations already ran
    fi
}

# Function to verify installation
verify_installation() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Verifying Installation${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    print_info "Checking service health..."
    log_message "Verifying installation"
    
    # Check services status
    check_services_status
    echo ""
    
    # Health check with retries
    if wait_for_health "http://localhost:$PORT/health"; then
        print_success "Aether Dashboard is running and healthy!"
        log_message "Installation verification successful"
        return 0
    else
        print_warning "Health check failed, but services might still be starting"
        print_info "Wait a few more seconds and check: http://localhost:$PORT/health"
        log_message "Health check failed (services may still be starting)"
        return 1
    fi
}

# Function to show installation summary
show_installation_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              Installation Complete! 🎉                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Installation Summary:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BLUE}Configuration File:${NC}  .env"
    echo -e "  ${BLUE}Log File:${NC}            $LOG_PATH"
    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
        echo -e "  ${BLUE}Backup File:${NC}          $BACKUP_FILE"
    fi
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
    log_message "Installation completed successfully"
}

# Main execution flow
main() {
    # Show menu and get user choice
    selected_action=$(show_menu)
    
    if [ -z "$selected_action" ]; then
        print_error "Invalid selection"
        exit 1
    fi
    
    # Execute selected action
    execute "$selected_action"
}

# Run main function
main

