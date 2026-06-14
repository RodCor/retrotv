-- RetroTV: public / official rooms shown in the navigator. Idempotent.
-- These use built-in public room models (newbie_lobby, pub_a, cinema_a, dusty_lounge)
-- which ship with their own furniture. Reload/reboot the emulator after applying.

-- Public navigator category for the official rooms.
INSERT INTO navigator_publiccats (id, name, image, visible, order_num)
VALUES (20, 'Salas oficiales', '0', '1', 0)
ON DUPLICATE KEY UPDATE name = VALUES(name), visible = '1';

-- Rebuild the RetroTV public rooms (idempotent).
DELETE FROM navigator_publics WHERE public_cat_id = 20;
DELETE FROM rooms WHERE owner_name = '[SYSTEM]' AND is_public = '1';

INSERT INTO rooms (owner_id, owner_name, name, description, model, state, users_max, category, is_public, is_staff_picked)
VALUES
  (0, '[SYSTEM]', 'Recepción',     '¡Bienvenido a RetroTV!',       'newbie_lobby', 'open', 60, 1, '1', '1'),
  (0, '[SYSTEM]', 'El Bar',        'Tómate algo y relájate',       'pub_a',        'open', 50, 1, '1', '1'),
  (0, '[SYSTEM]', 'Cine RetroTV',  'Sesión continua de pelis',     'cinema_a',     'open', 50, 1, '1', '1'),
  (0, '[SYSTEM]', 'Salón Lounge',  'El sitio para charlar',        'dusty_lounge', 'open', 50, 1, '1', '1');

-- List them in the navigator under the official category.
INSERT INTO navigator_publics (public_cat_id, room_id, visible)
SELECT 20, id, '1' FROM rooms WHERE owner_name = '[SYSTEM]' AND is_public = '1';
