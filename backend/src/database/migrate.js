const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Run main schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Main schema migration completed');
    
    // Run settings migration
    const settingsPath = path.join(__dirname, 'migrate-settings.sql');
    if (fs.existsSync(settingsPath)) {
      const settings = fs.readFileSync(settingsPath, 'utf8');
      await pool.query(settings);
      console.log('✅ Settings table migration completed');
    } else {
      console.warn('⚠️  Settings migration file not found, skipping...');
    }
    
    // Run Linkvertise settings migration
    const linkvertisePath = path.join(__dirname, 'migrate-linkvertise-settings.sql');
    if (fs.existsSync(linkvertisePath)) {
      const linkvertise = fs.readFileSync(linkvertisePath, 'utf8');
      await pool.query(linkvertise);
      console.log('✅ Linkvertise settings migration completed');
    } else {
      console.warn('⚠️  Linkvertise settings migration file not found, skipping...');
    }
    
    // Run update audit migration
    const updateAuditPath = path.join(__dirname, 'migrate-update-audit.sql');
    if (fs.existsSync(updateAuditPath)) {
      const updateAudit = fs.readFileSync(updateAuditPath, 'utf8');
      await pool.query(updateAudit);
      console.log('✅ Update audit table migration completed');
    } else {
      console.warn('⚠️  Update audit migration file not found, skipping...');
    }
    
    console.log('✅ Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

