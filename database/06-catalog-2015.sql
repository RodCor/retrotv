-- RetroTV: curated 2015-era catalog.
-- Hides the sprawling modern MS4 catalog and adds a clean, classic line-up using
-- furni that already ships in the asset pack. Re-runnable (keyed on page_special
-- = 'rtv2015'). To FULLY revert, restore database/backups/catalog-pre2015.sql.
--
-- After applying, reload the emulator catalog (restart arcturus or staff
-- :update_catalog) so the in-client shop refreshes.

-- 1) Remove any previous 2015 build so this is idempotent.
DELETE FROM catalog_items WHERE page_id IN (SELECT id FROM catalog_pages WHERE page_special = 'rtv2015');
DELETE FROM catalog_pages WHERE page_special = 'rtv2015';

-- 2) Hide the modern catalog so only the 2015 tree shows in the client.
UPDATE catalog_pages SET visible = '0' WHERE page_special <> 'rtv2015' OR page_special IS NULL;

-- Helper: insert one curated page, then fill it from items_base by classname.
-- (Done inline below; MariaDB needs the @page handoff per page.)

-- ---- Frontpage -------------------------------------------------------------
INSERT INTO catalog_pages
  (parent_id, caption_save, caption, page_layout, icon_color, icon_image, min_rank,
   order_num, visible, enabled, club_only, catalog_mode, vip_only, page_special,
   page_headline, page_teaser, page_text1, page_text2, page_text_details, page_text_teaser)
VALUES
  (-1, 'Bienvenido', 'Bienvenido', 'frontpage', 1, 213, 1, 1, '1', '1', '0', 'NORMAL', '0', 'rtv2015',
   '', '', '¡Bienvenido al catálogo clásico de RetroTV — estilo 2015!', '', '', '');

-- ---- Content pages (default_3x3 grid) --------------------------------------
-- Iced
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Iced','Iced','default_3x3',1,2,1,2,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,5,0,0,1,id,'0' FROM items_base WHERE item_name LIKE 'iced%' ORDER BY item_name LIMIT 24;

-- Pura
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Pura','Pura','default_3x3',1,3,1,3,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,6,0,0,1,id,'0' FROM items_base WHERE item_name LIKE 'pura%' ORDER BY item_name LIMIT 24;

-- Plasto
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Plasto','Plasto','default_3x3',1,4,1,4,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,4,0,0,1,id,'0' FROM items_base WHERE item_name LIKE '%plasto%' ORDER BY item_name LIMIT 24;

-- Asientos (chairs & sofas)
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Asientos','Asientos','default_3x3',1,5,1,5,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,5,0,0,1,id,'0' FROM items_base WHERE (item_name LIKE 'chair%' OR item_name LIKE 'sofa%' OR item_name LIKE 'armchair%') ORDER BY item_name LIMIT 24;

-- Mesas (tables)
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Mesas','Mesas','default_3x3',1,6,1,6,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,5,0,0,1,id,'0' FROM items_base WHERE item_name LIKE 'table%' ORDER BY item_name LIMIT 24;

-- Plantas
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Plantas','Plantas','default_3x3',1,7,1,7,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,4,0,0,1,id,'0' FROM items_base WHERE item_name LIKE 'plant_%' ORDER BY item_name LIMIT 20;

-- Iluminación (lamps)
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Iluminación','Iluminación','default_3x3',1,8,1,8,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,5,0,0,1,id,'0' FROM items_base WHERE (item_name LIKE 'lamp%' OR item_name LIKE '%light%' OR item_name LIKE 'neon%' OR item_name LIKE '%lantern%' OR item_name LIKE '%candle%') ORDER BY item_name LIMIT 22;

-- Habbo Club
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Habbo Club','Habbo Club','default_3x3',1,9,1,9,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,10,0,0,1,id,'0' FROM items_base WHERE item_name LIKE 'hc\_%' ORDER BY item_name LIMIT 24;

-- Rares
INSERT INTO catalog_pages (parent_id,caption_save,caption,page_layout,icon_color,icon_image,min_rank,order_num,visible,enabled,club_only,catalog_mode,vip_only,page_special,page_headline,page_teaser,page_text1,page_text2,page_text_details,page_text_teaser)
VALUES (-1,'Rares','Rares','default_3x3',1,10,1,10,'1','1','0','NORMAL','0','rtv2015','','','','','','');
SET @p := LAST_INSERT_ID();
INSERT INTO catalog_items (item_ids,page_id,catalog_name,cost_credits,cost_points,points_type,amount,order_number,club_only)
SELECT id,@p,item_name,500,0,0,1,id,'0' FROM items_base WHERE item_name LIKE 'rare\_%' ORDER BY item_name LIMIT 28;
