-- RetroTV: everyone gets effectively-unlimited coins + permanent Habbo Club.
-- New sign-ups get this from the CMS register action; this backfills existing
-- accounts. Safe to re-run. Note: log users out (or reboot the emulator) before
-- running, otherwise the emulator may write a cached balance back on logout.

-- 1) Effectively-unlimited credit coins for every account.
UPDATE users SET credits = 1000000000;

-- 2) Permanent Habbo Club for everyone.
--    Grant to accounts that don't have a HABBO_CLUB row yet...
INSERT INTO users_subscriptions
  (user_id, subscription_type, timestamp_start, duration, active)
SELECT u.id, 'HABBO_CLUB', UNIX_TIMESTAMP(), 4000000000, 1
  FROM users u
 WHERE NOT EXISTS (
   SELECT 1 FROM users_subscriptions s
    WHERE s.user_id = u.id AND s.subscription_type = 'HABBO_CLUB'
 );

--    ...and refresh existing HABBO_CLUB rows to "forever".
UPDATE users_subscriptions
   SET timestamp_start = UNIX_TIMESTAMP(), duration = 4000000000, active = 1
 WHERE subscription_type = 'HABBO_CLUB';
