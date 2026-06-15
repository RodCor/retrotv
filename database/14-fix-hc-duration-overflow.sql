-- RetroTV: fix HC "permanent" duration integer overflow.
--
-- The seed used duration = 4000000000, which fits the unsigned-int column but
-- exceeds signed-int max (2147483647). Arcturus reads `duration` with JDBC
-- getInt() (Subscription stores it as a Java int), so every HC payday cycle
-- threw `java.sql.SQLDataException: integer overflow` and the user's stats
-- failed to load.
--
-- We also can't just clamp duration to int-max: Subscription.getRemaining()
-- computes (timestamp_start + duration) - now AS AN INT, so the END timestamp
-- must itself stay <= 2147483647 or it wraps negative and the scheduler would
-- silently expire everyone's HC. Arcturus uses signed-int unix timestamps
-- throughout (an inherent Y2038 ceiling), so "forever" = right up to that cap.
--
-- duration = 2147483647 - timestamp_start  =>  end == Integer.MAX_VALUE. Safe.
UPDATE users_subscriptions
   SET timestamp_start = UNIX_TIMESTAMP(),
       duration = 2147483647 - UNIX_TIMESTAMP(),
       active = 1
 WHERE subscription_type = 'HABBO_CLUB';
