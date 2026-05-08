-- 024_restore_signup_trigger.sql
--
-- Migration 023 dropped the on_auth_user_created trigger because the
-- old version was seeding hardcoded data (86 kg weight + 3 habits).
-- But we still need a trigger to create the user_profiles row on
-- signup, otherwise the onboarding's .update() calls silently fail
-- against a non-existent row.
--
-- This restores the trigger, but it now points at the simplified
-- handle_new_user / initialize_user_data flow (defined in 002 and
-- replaced in 023) which only inserts an empty user_profiles row —
-- no fake weight log, no auto-seeded habits.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
