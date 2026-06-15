-- RetroTV: remove the hand-built/classic public rooms.
-- They didn't meet the bar (flat models, placeholder furni) and we're parking
-- public rooms until we can import proper expert builds. This drops rooms 4-19
-- (the 15 classic set + the Lido) with their items and navigator entries, plus
-- the custom pool model. Standard shared models (newbie_lobby, rooftop, ...) are
-- left intact. Idempotent.
DELETE FROM items             WHERE room_id BETWEEN 4 AND 19;
DELETE FROM navigator_publics WHERE room_id BETWEEN 4 AND 19;
DELETE FROM rooms             WHERE id      BETWEEN 4 AND 19;
DELETE FROM navigator_publiccats WHERE id = 20;
DELETE FROM room_models       WHERE name = 'retrotv_pool';
