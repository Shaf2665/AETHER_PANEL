-- Migration: Add update_audit table for tracking system updates
CREATE TABLE IF NOT EXISTS update_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
    previous_commit VARCHAR(40),
    new_commit VARCHAR(40),
    logs JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_update_audit_initiated_by ON update_audit(initiated_by);
CREATE INDEX IF NOT EXISTS idx_update_audit_status ON update_audit(status);
CREATE INDEX IF NOT EXISTS idx_update_audit_started_at ON update_audit(started_at DESC);

