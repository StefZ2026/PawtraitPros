#!/usr/bin/env python3
"""Apply RLS policies and performance indexes to the Pawtrait Pros database.
Defense-in-depth: backend uses service_role (bypasses RLS), but these policies
protect against accidental client SDK exposure."""

import os
import psycopg2
import sys

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    print("ERROR: DATABASE_URL environment variable is not set.")
    sys.exit(1)

SQL_STATEMENTS = [
    # --- Helper function: get the org_id for the current authenticated user ---
    """
    CREATE OR REPLACE FUNCTION public.get_user_org_id()
    RETURNS integer
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $$
      SELECT id FROM public.organizations
      WHERE owner_id = auth.uid()::varchar
      LIMIT 1;
    $$;
    """,

    # --- Revoke dangerous grants from anon ---
    "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;",

    # --- RLS Policies ---

    # organizations: users see only their own org
    """CREATE POLICY "Users can view own org" ON organizations
       FOR SELECT TO authenticated
       USING (owner_id = auth.uid()::varchar);""",
    """CREATE POLICY "Users can update own org" ON organizations
       FOR UPDATE TO authenticated
       USING (owner_id = auth.uid()::varchar)
       WITH CHECK (owner_id = auth.uid()::varchar);""",

    # users: users see only their own record
    """CREATE POLICY "Users can view own profile" ON users
       FOR SELECT TO authenticated
       USING (id = auth.uid()::varchar);""",
    """CREATE POLICY "Users can update own profile" ON users
       FOR UPDATE TO authenticated
       USING (id = auth.uid()::varchar)
       WITH CHECK (id = auth.uid()::varchar);""",

    # portrait_styles: read-only reference data for all authenticated users
    """CREATE POLICY "Authenticated users can view styles" ON portrait_styles
       FOR SELECT TO authenticated
       USING (true);""",
    # Also allow anon to read styles (public gallery needs it)
    """GRANT SELECT ON portrait_styles TO anon;""",
    """CREATE POLICY "Public can view styles" ON portrait_styles
       FOR SELECT TO anon
       USING (true);""",

    # subscription_plans: read-only reference data
    """CREATE POLICY "Authenticated users can view plans" ON subscription_plans
       FOR SELECT TO authenticated
       USING (true);""",
    # Also allow anon to read plans (pricing page)
    """GRANT SELECT ON subscription_plans TO anon;""",
    """CREATE POLICY "Public can view plans" ON subscription_plans
       FOR SELECT TO anon
       USING (true);""",

    # dogs: scoped to organization
    """CREATE POLICY "Users can view own org dogs" ON dogs
       FOR SELECT TO authenticated
       USING (organization_id = get_user_org_id());""",
    """CREATE POLICY "Users can insert own org dogs" ON dogs
       FOR INSERT TO authenticated
       WITH CHECK (organization_id = get_user_org_id());""",
    """CREATE POLICY "Users can update own org dogs" ON dogs
       FOR UPDATE TO authenticated
       USING (organization_id = get_user_org_id())
       WITH CHECK (organization_id = get_user_org_id());""",
    """CREATE POLICY "Users can delete own org dogs" ON dogs
       FOR DELETE TO authenticated
       USING (organization_id = get_user_org_id());""",

    # portraits: via dog's org
    """CREATE POLICY "Users can view own org portraits" ON portraits
       FOR SELECT TO authenticated
       USING (dog_id IN (SELECT id FROM dogs WHERE organization_id = get_user_org_id()));""",
    """CREATE POLICY "Users can manage own org portraits" ON portraits
       FOR ALL TO authenticated
       USING (dog_id IN (SELECT id FROM dogs WHERE organization_id = get_user_org_id()))
       WITH CHECK (dog_id IN (SELECT id FROM dogs WHERE organization_id = get_user_org_id()));""",

    # batch_sessions: scoped to organization
    """CREATE POLICY "Users can manage own org batch sessions" ON batch_sessions
       FOR ALL TO authenticated
       USING (organization_id = get_user_org_id())
       WITH CHECK (organization_id = get_user_org_id());""",

    # batch_photos: via batch_session's org
    """CREATE POLICY "Users can manage own org batch photos" ON batch_photos
       FOR ALL TO authenticated
       USING (batch_session_id IN (SELECT id FROM batch_sessions WHERE organization_id = get_user_org_id()))
       WITH CHECK (batch_session_id IN (SELECT id FROM batch_sessions WHERE organization_id = get_user_org_id()));""",

    # customer_sessions: scoped to organization
    """CREATE POLICY "Users can manage own org customer sessions" ON customer_sessions
       FOR ALL TO authenticated
       USING (organization_id = get_user_org_id())
       WITH CHECK (organization_id = get_user_org_id());""",

    # daily_pack_selections: scoped to organization
    """CREATE POLICY "Users can manage own org pack selections" ON daily_pack_selections
       FOR ALL TO authenticated
       USING (organization_id = get_user_org_id())
       WITH CHECK (organization_id = get_user_org_id());""",

    # merch_orders: scoped to organization
    """CREATE POLICY "Users can manage own org merch orders" ON merch_orders
       FOR ALL TO authenticated
       USING (organization_id = get_user_org_id())
       WITH CHECK (organization_id = get_user_org_id());""",

    # merch_order_items: via order's org
    """CREATE POLICY "Users can manage own org merch items" ON merch_order_items
       FOR ALL TO authenticated
       USING (order_id IN (SELECT id FROM merch_orders WHERE organization_id = get_user_org_id()))
       WITH CHECK (order_id IN (SELECT id FROM merch_orders WHERE organization_id = get_user_org_id()));""",

    # visit_photos: scoped to organization
    """CREATE POLICY "Users can manage own org visit photos" ON visit_photos
       FOR ALL TO authenticated
       USING (organization_id = get_user_org_id())
       WITH CHECK (organization_id = get_user_org_id());""",

    # --- Performance Indexes for RLS policy queries ---
    "CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);",
    "CREATE INDEX IF NOT EXISTS idx_dogs_organization_id ON dogs(organization_id);",
    "CREATE INDEX IF NOT EXISTS idx_batch_sessions_organization_id ON batch_sessions(organization_id);",
    "CREATE INDEX IF NOT EXISTS idx_customer_sessions_organization_id ON customer_sessions(organization_id);",
    "CREATE INDEX IF NOT EXISTS idx_merch_orders_organization_id ON merch_orders(organization_id);",
    "CREATE INDEX IF NOT EXISTS idx_visit_photos_organization_id ON visit_photos(organization_id);",
    "CREATE INDEX IF NOT EXISTS idx_portraits_dog_id ON portraits(dog_id);",
    "CREATE INDEX IF NOT EXISTS idx_merch_order_items_order_id ON merch_order_items(order_id);",
    "CREATE INDEX IF NOT EXISTS idx_batch_photos_batch_session_id ON batch_photos(batch_session_id);",
]


def main():
    print("Connecting to Pawtrait Pros database...")
    conn = psycopg2.connect(DB_URL, sslmode="require")
    conn.autocommit = False
    cur = conn.cursor()

    success = 0
    skipped = 0
    errors = []

    for i, sql in enumerate(SQL_STATEMENTS):
        label = sql.strip().split("\n")[0][:80]
        try:
            cur.execute(sql)
            conn.commit()
            success += 1
            print(f"  [{i+1}/{len(SQL_STATEMENTS)}] OK: {label}")
        except Exception as e:
            conn.rollback()
            err_msg = str(e).strip()
            if "already exists" in err_msg:
                skipped += 1
                print(f"  [{i+1}/{len(SQL_STATEMENTS)}] SKIP (exists): {label}")
            else:
                errors.append((label, err_msg))
                print(f"  [{i+1}/{len(SQL_STATEMENTS)}] ERROR: {label}")
                print(f"    -> {err_msg}")

    cur.close()
    conn.close()

    print(f"\nDone: {success} applied, {skipped} skipped, {len(errors)} errors")
    if errors:
        print("\nErrors:")
        for label, msg in errors:
            print(f"  - {label}: {msg}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
