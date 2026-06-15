-- RetroTV RPG — starter abilities for the default ruleset (id 1).
-- damage_expr stores the ability's bonus "power" (added to ATK before the d6).
-- area_shape: single (target only) · radius (blast around target, area_size = radius)
--             · line (ray from caster toward target, area_size = length).
INSERT INTO rpg_abilities (id, ruleset_id, name, cost, range_tiles, area_shape, area_size, damage_expr, cooldown) VALUES
 (1, 1, 'Golpe', 0, 1, 'single', 0, '4',  0),
 (2, 1, 'Tajo',  15, 1, 'line',   3, '2',  1),
 (3, 1, 'Bola',  25, 5, 'radius', 1, '6',  2),
 (4, 1, 'Rayo',  20, 6, 'line',   6, '5',  2)
ON DUPLICATE KEY UPDATE
  name=VALUES(name), cost=VALUES(cost), range_tiles=VALUES(range_tiles),
  area_shape=VALUES(area_shape), area_size=VALUES(area_size),
  damage_expr=VALUES(damage_expr), cooldown=VALUES(cooldown);
