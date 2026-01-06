-- SASQART QA System - Row Level Security Policies
-- Multi-tenant data isolation

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE output_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the current user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is admin or physicist
CREATE OR REPLACE FUNCTION is_admin_or_physicist()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'physicist')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = get_user_organization_id());

-- Only admins can update organization settings
CREATE POLICY "Admins can update own organization"
  ON organizations FOR UPDATE
  USING (id = get_user_organization_id() AND is_admin())
  WITH CHECK (id = get_user_organization_id() AND is_admin());

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view profiles in their organization
CREATE POLICY "Users can view org profiles"
  ON profiles FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile in their org
CREATE POLICY "Admins can update org profiles"
  ON profiles FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND is_admin()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_admin()
  );

-- New users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- EQUIPMENT POLICIES
-- ============================================================================

-- Users can view equipment in their organization
CREATE POLICY "Users can view org equipment"
  ON equipment FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Admins and physicists can manage equipment
CREATE POLICY "Admins and physicists can insert equipment"
  ON equipment FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_admin_or_physicist()
  );

CREATE POLICY "Admins and physicists can update equipment"
  ON equipment FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND is_admin_or_physicist()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_admin_or_physicist()
  );

CREATE POLICY "Admins can delete equipment"
  ON equipment FOR DELETE
  USING (
    organization_id = get_user_organization_id()
    AND is_admin()
  );

-- ============================================================================
-- QA TEST DEFINITIONS POLICIES
-- ============================================================================

-- All authenticated users can view test definitions (they're global)
CREATE POLICY "Authenticated users can view test definitions"
  ON qa_test_definitions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- QA REPORTS POLICIES
-- ============================================================================

-- Users can view reports in their organization
CREATE POLICY "Users can view org reports"
  ON qa_reports FOR SELECT
  USING (organization_id = get_user_organization_id());

-- All users can create reports
CREATE POLICY "Users can create reports"
  ON qa_reports FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Users can update their own draft reports
CREATE POLICY "Users can update own draft reports"
  ON qa_reports FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND (
      (created_by = auth.uid() AND status = 'draft')
      OR is_admin_or_physicist()
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
  );

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
  ON qa_reports FOR DELETE
  USING (
    organization_id = get_user_organization_id()
    AND is_admin()
  );

-- ============================================================================
-- QA TESTS POLICIES
-- ============================================================================

-- Users can view test results for their org's reports
CREATE POLICY "Users can view org test results"
  ON qa_tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qa_reports
      WHERE qa_reports.id = qa_tests.report_id
      AND qa_reports.organization_id = get_user_organization_id()
    )
  );

-- Users can insert test results for their reports
CREATE POLICY "Users can insert test results"
  ON qa_tests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qa_reports
      WHERE qa_reports.id = qa_tests.report_id
      AND qa_reports.organization_id = get_user_organization_id()
    )
  );

-- Users can update test results for their draft reports
CREATE POLICY "Users can update test results"
  ON qa_tests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM qa_reports
      WHERE qa_reports.id = qa_tests.report_id
      AND qa_reports.organization_id = get_user_organization_id()
      AND (
        (qa_reports.created_by = auth.uid() AND qa_reports.status = 'draft')
        OR is_admin_or_physicist()
      )
    )
  );

-- Users can delete test results for their draft reports
CREATE POLICY "Users can delete test results"
  ON qa_tests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM qa_reports
      WHERE qa_reports.id = qa_tests.report_id
      AND qa_reports.organization_id = get_user_organization_id()
      AND qa_reports.created_by = auth.uid()
      AND qa_reports.status = 'draft'
    )
  );

-- ============================================================================
-- OUTPUT READINGS POLICIES
-- ============================================================================

-- Users can view output readings in their organization
CREATE POLICY "Users can view org output readings"
  ON output_readings FOR SELECT
  USING (organization_id = get_user_organization_id());

-- All users can create output readings
CREATE POLICY "Users can create output readings"
  ON output_readings FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Admins and physicists can update output readings
CREATE POLICY "Admins and physicists can update output readings"
  ON output_readings FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND is_admin_or_physicist()
  );

-- Admins can delete output readings
CREATE POLICY "Admins can delete output readings"
  ON output_readings FOR DELETE
  USING (
    organization_id = get_user_organization_id()
    AND is_admin()
  );

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Users can view audit logs for their organization
CREATE POLICY "Users can view org audit logs"
  ON audit_log FOR SELECT
  USING (organization_id = get_user_organization_id());

-- System/service can insert audit logs
CREATE POLICY "Service can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- INVITATIONS POLICIES
-- ============================================================================

-- Admins can view invitations for their organization
CREATE POLICY "Admins can view org invitations"
  ON invitations FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND is_admin()
  );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_admin()
  );

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  USING (
    organization_id = get_user_organization_id()
    AND is_admin()
  );

-- Anyone can read invitation by token (for accepting)
CREATE POLICY "Anyone can read invitation by token"
  ON invitations FOR SELECT
  USING (token IS NOT NULL);
