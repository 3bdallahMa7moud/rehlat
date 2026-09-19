-- ============================================================
-- Journey of Change - AI Reports, Notifications, Daily Content
-- ============================================================

-- ============================================================
-- AI REPORTS
-- ============================================================

CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  requested_by_id UUID REFERENCES participants(id),
  scope VARCHAR(20) NOT NULL,
  report_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  period_start DATE,
  period_end DATE,
  source_snapshot JSONB,
  analysis JSONB,
  model VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,

  CONSTRAINT chk_scope CHECK (scope IN ('PARTICIPANT', 'GROUP')),
  CONSTRAINT chk_report_type CHECK (report_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'FULL', 'ON_DEMAND')),
  CONSTRAINT chk_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  CONSTRAINT chk_participant_scope CHECK ((scope = 'PARTICIPANT' AND participant_id IS NOT NULL) OR (scope = 'GROUP' AND participant_id IS NULL))
);

CREATE INDEX idx_ai_reports_participant ON ai_reports (participant_id, created_at DESC);
CREATE INDEX idx_ai_reports_requested_by ON ai_reports (requested_by_id, created_at DESC);
CREATE INDEX idx_ai_reports_status ON ai_reports (status);
CREATE INDEX idx_ai_reports_period ON ai_reports (period_start, period_end);

COMMENT ON TABLE ai_reports IS 'AI-generated analysis and reports storage';
COMMENT ON COLUMN ai_reports.source_snapshot IS 'Exact trusted data snapshot used for analysis';
COMMENT ON COLUMN ai_reports.analysis IS 'AI-generated analysis results';
COMMENT ON COLUMN ai_reports.model IS 'AI model used for generation';

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES participants(id),
  sender_id UUID REFERENCES participants(id),
  source VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title_ar VARCHAR(300),
  title_en VARCHAR(300),
  message_ar TEXT,
  message_en TEXT,
  metadata JSONB DEFAULT '{}',
  is_persistent BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_source CHECK (source IN ('SYSTEM', 'ADMIN', 'AI'))
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notifications_sender ON notifications (sender_id) WHERE sender_id IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications (recipient_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_persistent ON notifications (is_persistent) WHERE is_persistent = true;

COMMENT ON TABLE notifications IS 'Internal notifications only (no WhatsApp)';
COMMENT ON COLUMN notifications.source IS 'SYSTEM, ADMIN, or AI';
COMMENT ON COLUMN notifications.sender_id IS 'For ADMIN source, who sent it';
COMMENT ON COLUMN notifications.is_persistent IS 'Important notifications that should not auto-dismiss';

-- ============================================================
-- DAILY CONTENT
-- ============================================================

CREATE TABLE daily_content (
  content_date DATE PRIMARY KEY,
  quote_ar TEXT,
  quote_en TEXT,
  image_url TEXT,
  religious_content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_content_date ON daily_content (content_date DESC);

CREATE TRIGGER daily_content_updated_at BEFORE UPDATE ON daily_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE daily_content IS 'Daily inspirational content (حكمة اليوم, images, etc.)';
COMMENT ON COLUMN daily_content.religious_content IS 'Additional religious content (JSON) - not authoritative Quran text';
