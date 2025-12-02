const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const UpdateAudit = require('../models/UpdateAudit');

class UpdateService {
  constructor() {
    this.isUpdating = false;
    this.updateLogs = [];
    this.updateRunnerContainer = 'aether-update-runner';
    this.currentCommit = null;
    this.currentAuditId = null;
  }

  /**
   * Execute command in update-runner container
   */
  async executeInContainer(command, timeout = 60000) {
    return new Promise((resolve, reject) => {
      // Escape command for shell execution
      const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, '\\$');
      const dockerCmd = `docker exec ${this.updateRunnerContainer} sh -c "${escapedCommand}"`;
      
      const proc = exec(dockerCmd, {
        timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }, (error, stdout, stderr) => {
        if (error) {
          const errorMsg = stderr || error.message || 'Command execution failed';
          this.addLog('error', `Command failed: ${errorMsg}`);
          reject(new Error(errorMsg));
        } else {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        }
      });

      proc.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.addLog('info', output);
        }
      });

      proc.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output && !output.includes('WARNING')) {
          this.addLog('warning', output);
        }
      });
    });
  }

  /**
   * Add log entry
   */
  addLog(type, message) {
    const logEntry = {
      type,
      message,
      timestamp: new Date().toISOString()
    };
    this.updateLogs.push(logEntry);
    
    // Update audit record if exists
    if (this.currentAuditId) {
      UpdateAudit.update(this.currentAuditId, { logs: this.updateLogs }).catch(err => {
        console.error('Failed to update audit logs:', err);
      });
    }
  }

  /**
   * Check if update-runner container is running
   */
  async checkUpdateRunnerAvailable() {
    try {
      const { stdout } = await execPromise(`docker ps --filter name=${this.updateRunnerContainer} --format "{{.Names}}"`);
      return stdout.trim() === this.updateRunnerContainer;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start update-runner container if not running
   */
  async ensureUpdateRunnerRunning() {
    const isRunning = await this.checkUpdateRunnerAvailable();
    
    if (!isRunning) {
      this.addLog('info', 'Starting update runner container...');
      
      try {
        // Determine docker-compose command (v1 or v2)
        let dockerComposeCmd = 'docker-compose';
        try {
          await execPromise('docker compose version', { timeout: 5000 });
          dockerComposeCmd = 'docker compose';
        } catch (e) {
          // Fallback to docker-compose v1
        }

        await execPromise(`${dockerComposeCmd} --profile update up -d update-runner`, {
          timeout: 30000,
          cwd: process.env.PROJECT_ROOT || process.cwd()
        });
        
        // Wait for container to be ready
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify it's running
        const verified = await this.checkUpdateRunnerAvailable();
        if (!verified) {
          throw new Error('Update runner container failed to start');
        }
        
        this.addLog('success', 'Update runner container started');
        return true;
      } catch (error) {
        this.addLog('error', `Failed to start update runner: ${error.message}`);
        throw new Error('Update runner container is not available. Please ensure Docker Compose is accessible.');
      }
    }
    
    return true;
  }

  /**
   * Validate prerequisites
   */
  async validatePrerequisites() {
    this.addLog('info', 'Validating prerequisites...');
    
    // Check if update-runner container can be started/accessed
    await this.ensureUpdateRunnerRunning();
    
    // Check git in container
    try {
      await this.executeInContainer('git --version', 5000);
      this.addLog('success', 'Git is available');
    } catch (error) {
      throw new Error('Git is not available in update runner container');
    }

    // Check docker-compose in container
    try {
      await this.executeInContainer('docker compose version || docker-compose --version', 5000);
      this.addLog('success', 'Docker Compose is available');
    } catch (error) {
      throw new Error('Docker Compose is not available in update runner container');
    }

    // Check if project directory is a git repository
    try {
      const { stdout } = await this.executeInContainer('test -d .git && echo "yes" || echo "no"', 5000);
      if (stdout !== 'yes') {
        throw new Error('Project directory is not a git repository');
      }
      this.addLog('success', 'Git repository detected');
    } catch (error) {
      throw new Error('Project directory is not a valid git repository');
    }

    // Check ENABLE_SYSTEM_UPDATE env var
    if (process.env.ENABLE_SYSTEM_UPDATE !== 'true') {
      throw new Error('System updates are disabled. Set ENABLE_SYSTEM_UPDATE=true to enable.');
    }

    this.addLog('success', 'All prerequisites validated');
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommit() {
    try {
      const { stdout } = await this.executeInContainer('git rev-parse HEAD', 10000);
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current commit: ${error.message}`);
    }
  }

  /**
   * Pull latest code from repository
   */
  async pullLatestCode() {
    this.addLog('info', 'Pulling latest code from GitHub...');
    
    try {
      // Check for uncommitted changes
      try {
        const { stdout } = await this.executeInContainer('git status --porcelain', 10000);
        if (stdout.trim()) {
          this.addLog('warning', 'Uncommitted changes detected. Stashing...');
          await this.executeInContainer('git stash push -m "Auto-stash before update"', 30000);
        }
      } catch (error) {
        // Ignore - git status might fail in some cases
      }

      // Save current commit for rollback
      this.currentCommit = await this.getCurrentCommit();
      this.addLog('info', `Current commit: ${this.currentCommit.substring(0, 7)}`);

      // Pull with retry logic
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            const delay = Math.pow(2, attempt) * 1000;
            this.addLog('info', `Retry attempt ${attempt}/${maxRetries} (waiting ${delay/1000}s)...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          await this.executeInContainer('git pull --rebase origin main', 60000);
          
          // Verify git repository integrity
          await this.executeInContainer('git fsck --no-progress', 30000);
          
          // Check if commit changed
          const newCommit = await this.getCurrentCommit();
          if (newCommit === this.currentCommit) {
            this.addLog('info', 'Already up to date');
            return false; // No updates
          }
          
          this.addLog('success', `Code pulled successfully. New commit: ${newCommit.substring(0, 7)}`);
          return true; // Updated
          
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            continue;
          }
        }
      }
      
      throw new Error(`Git pull failed after ${maxRetries} attempts: ${lastError.message}`);
      
    } catch (error) {
      // Restore stash if pull failed
      try {
        await this.executeInContainer('git stash pop', 10000);
      } catch (e) {
        // Ignore stash pop errors
      }
      throw error;
    }
  }

  /**
   * Rebuild containers
   */
  async rebuildContainers() {
    this.addLog('info', 'Rebuilding Docker containers...');
    
    try {
      // Determine docker-compose command
      let dockerComposeCmd = 'docker-compose';
      try {
        await this.executeInContainer('docker compose version', 5000);
        dockerComposeCmd = 'docker compose';
      } catch (e) {
        dockerComposeCmd = 'docker-compose';
      }

      // Build new container WITHOUT stopping old one
      this.addLog('info', 'Building new container (old container still running)...');
      await this.executeInContainer(`${dockerComposeCmd} build aether-dashboard`, 300000);
      
      // Start new container (docker-compose will handle stopping old one)
      this.addLog('info', 'Starting new container...');
      await this.executeInContainer(`${dockerComposeCmd} up -d --no-deps aether-dashboard`, 60000);
      
      // Wait for health
      await this.waitForHealth(60000);
      
      this.addLog('success', 'Containers rebuilt successfully');
      return true;
    } catch (error) {
      this.addLog('error', `Container rebuild failed: ${error.message}`);
      this.addLog('info', 'Old container should still be running');
      throw error;
    }
  }

  /**
   * Wait for container health
   */
  async waitForHealth(timeout) {
    this.addLog('info', 'Waiting for container to be healthy...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        let dockerComposeCmd = 'docker-compose';
        try {
          await this.executeInContainer('docker compose version', 5000);
          dockerComposeCmd = 'docker compose';
        } catch (e) {
          dockerComposeCmd = 'docker-compose';
        }

        const { stdout } = await this.executeInContainer(
          `${dockerComposeCmd} ps aether-dashboard --format "{{.Status}}"`,
          10000
        );
        
        if (stdout.includes('Up') && !stdout.includes('unhealthy')) {
          this.addLog('success', 'Container is healthy');
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      } catch (error) {
        // Continue checking
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Container health check timeout');
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    this.addLog('info', 'Running database migrations...');
    
    try {
      // Wait for containers to be ready
      this.addLog('info', 'Waiting for containers to be ready...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      let dockerComposeCmd = 'docker-compose';
      try {
        await this.executeInContainer('docker compose version', 5000);
        dockerComposeCmd = 'docker compose';
      } catch (e) {
        dockerComposeCmd = 'docker-compose';
      }

      // Execute migrations
      await this.executeInContainer(
        `${dockerComposeCmd} exec -T aether-dashboard npm run migrate`,
        120000
      );
      
      this.addLog('success', 'Migrations completed successfully');
      return true;
    } catch (error) {
      this.addLog('error', `Migration failed: ${error.message}`);
      this.addLog('warning', 'System may be in inconsistent state. Manual intervention may be required.');
      throw error;
    }
  }

  /**
   * Verify system health
   */
  async verifyHealth() {
    this.addLog('info', 'Verifying system health...');
    
    try {
      let dockerComposeCmd = 'docker-compose';
      try {
        await this.executeInContainer('docker compose version', 5000);
        dockerComposeCmd = 'docker compose';
      } catch (e) {
        dockerComposeCmd = 'docker-compose';
      }

      const { stdout } = await this.executeInContainer(
        `${dockerComposeCmd} ps aether-dashboard --format "{{.Status}}"`,
        10000
      );
      
      if (stdout.includes('Up') && !stdout.includes('unhealthy')) {
        this.addLog('success', 'System health check passed');
        return true;
      } else {
        throw new Error('Container is not healthy');
      }
    } catch (error) {
      this.addLog('error', `Health check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rollback to previous commit
   */
  async rollback(commitHash) {
    if (!commitHash) {
      this.addLog('error', 'Cannot rollback: no previous commit saved');
      return false;
    }

    this.addLog('warning', `Rolling back to commit ${commitHash.substring(0, 7)}...`);
    
    try {
      await this.executeInContainer(`git reset --hard ${commitHash}`, 30000);
      
      let dockerComposeCmd = 'docker-compose';
      try {
        await this.executeInContainer('docker compose version', 5000);
        dockerComposeCmd = 'docker compose';
      } catch (e) {
        dockerComposeCmd = 'docker-compose';
      }

      await this.executeInContainer(`${dockerComposeCmd} up -d --build aether-dashboard`, 300000);
      
      this.addLog('success', 'Rollback completed');
      return true;
    } catch (error) {
      this.addLog('error', `Rollback failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Perform system update
   */
  async performUpdate(initiatedBy) {
    if (this.isUpdating) {
      throw new Error('Update already in progress');
    }

    this.isUpdating = true;
    this.updateLogs = [];
    this.currentCommit = null;
    const startTime = Date.now();

    try {
      // Create audit record
      const audit = await UpdateAudit.create({
        initiated_by: initiatedBy,
        status: 'in_progress',
        logs: []
      });
      this.currentAuditId = audit.id;

      this.addLog('info', 'Starting system update...');

      // Step 1: Ensure update-runner running
      await this.ensureUpdateRunnerRunning();

      // Step 2: Validate prerequisites
      await this.validatePrerequisites();

      // Step 3: Save current commit
      this.currentCommit = await this.getCurrentCommit();

      // Step 4: Pull latest code
      const hasUpdates = await this.pullLatestCode();
      if (!hasUpdates) {
        await UpdateAudit.update(this.currentAuditId, {
          status: 'completed',
          new_commit: this.currentCommit,
          completed_at: new Date(),
          duration_seconds: Math.floor((Date.now() - startTime) / 1000)
        });
        return {
          success: true,
          logs: this.updateLogs,
          message: 'Already up to date'
        };
      }

      const newCommit = await this.getCurrentCommit();

      // Step 5: Rebuild containers
      await this.rebuildContainers();

      // Step 6: Run migrations
      await this.runMigrations();

      // Step 7: Verify health
      await this.verifyHealth();

      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Update audit record
      await UpdateAudit.update(this.currentAuditId, {
        status: 'completed',
        previous_commit: this.currentCommit,
        new_commit: newCommit,
        completed_at: new Date(),
        duration_seconds: duration
      });

      this.addLog('success', 'Update completed successfully!');
      
      return {
        success: true,
        logs: this.updateLogs,
        previousCommit: this.currentCommit,
        newCommit: newCommit
      };
      
    } catch (error) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Update audit record with error
      if (this.currentAuditId) {
        await UpdateAudit.update(this.currentAuditId, {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date(),
          duration_seconds: duration
        }).catch(err => {
          console.error('Failed to update audit record:', err);
        });
      }

      this.addLog('error', `Update failed: ${error.message}`);

      // Attempt rollback
      if (this.currentCommit) {
        this.addLog('warning', 'Attempting rollback...');
        try {
          await this.rollback(this.currentCommit);
          if (this.currentAuditId) {
            await UpdateAudit.update(this.currentAuditId, {
              status: 'rolled_back'
            }).catch(() => {});
          }
        } catch (rollbackError) {
          this.addLog('error', `Rollback failed: ${rollbackError.message}`);
          this.addLog('error', 'Manual intervention required');
        }
      }

      return {
        success: false,
        error: error.message,
        logs: this.updateLogs
      };
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Get current logs
   */
  getLogs() {
    return this.updateLogs;
  }

  /**
   * Get update status
   */
  getStatus() {
    return {
      isUpdating: this.isUpdating,
      logs: this.updateLogs,
      canUpdate: process.env.ENABLE_SYSTEM_UPDATE === 'true'
    };
  }
}

module.exports = new UpdateService();

