-- RetroTV: Rares and Arquitecto (Builders Club) furni have no price.
UPDATE catalog_items ci JOIN catalog_pages p ON p.id = ci.page_id
   SET ci.cost_credits = 0, ci.cost_points = 0
 WHERE p.page_special = 'rtv2015'
   AND ( p.caption IN ('Rares', 'Rares Bonus')
      OR p.parent_id = (SELECT id FROM (SELECT id FROM catalog_pages WHERE caption='Arquitecto' AND page_special='rtv2015' LIMIT 1) x) );
