-- Spanish captions for the main catalog pages (the visible shop navigation).
-- Applied on DB init (after the base dump) and idempotent: it matches on the
-- English caption, so re-running it is harmless. Long-tail pages keep their
-- original names; edit them in the admin CRM's Catalog page if needed.
USE `habbo`;

UPDATE `catalog_pages` SET `caption` = CASE `caption`
  WHEN 'Front Page'            THEN 'Página principal'
  WHEN 'Furni'                 THEN 'Furnis'
  WHEN 'Clothing'              THEN 'Ropa'
  WHEN 'Pets'                  THEN 'Mascotas'
  WHEN 'Building'              THEN 'Construcción'
  WHEN 'Credit Furni'          THEN 'Furnis de crédito'
  WHEN 'Room Bundles'          THEN 'Packs de sala'
  WHEN 'Room Event'            THEN 'Eventos de sala'
  WHEN 'Limited Rares'         THEN 'Rares limitados'
  WHEN 'Indoor Furni'          THEN 'Furnis de interior'
  WHEN 'Outdoor Furni'         THEN 'Furnis de exterior'
  WHEN 'Room Building'         THEN 'Construcción de salas'
  WHEN 'Furni By Line'         THEN 'Furnis por línea'
  WHEN 'Habbo Club'            THEN 'Habbo Club'
  WHEN 'Wired'                 THEN 'Wired'
  WHEN 'Bots'                  THEN 'Bots'
  WHEN 'Game Shop'             THEN 'Tienda de juegos'
  WHEN 'Habbo Groups'          THEN 'Grupos Habbo'
  WHEN 'Music Shop'            THEN 'Tienda de música'
  WHEN 'Marketplace'           THEN 'Mercadillo'
  WHEN 'Purchase History'      THEN 'Historial de compras'
  WHEN 'Top Picks'             THEN 'Destacados'
  WHEN 'New Additions'         THEN 'Novedades'
  WHEN 'Outfits'               THEN 'Conjuntos'
  WHEN 'Hairdos'               THEN 'Peinados'
  WHEN 'Hats'                  THEN 'Sombreros'
  WHEN 'Accessories'           THEN 'Accesorios'
  WHEN 'Dresses'               THEN 'Vestidos'
  WHEN 'Shirts'                THEN 'Camisetas'
  WHEN 'Jackets'               THEN 'Chaquetas'
  WHEN 'Trousers'              THEN 'Pantalones'
  WHEN 'Skirts'                THEN 'Faldas'
  WHEN 'Shoes'                 THEN 'Zapatos'
  WHEN 'Effects'               THEN 'Efectos'
  WHEN 'Temporary Effects'     THEN 'Efectos temporales'
  WHEN 'Pet Animals'           THEN 'Animales'
  WHEN 'Baby Pet Animals'      THEN 'Animales bebé'
  WHEN 'Pet Equipment'         THEN 'Equipo de mascotas'
  WHEN 'Breeding Boxes'        THEN 'Cajas de cría'
  WHEN 'Monster Plants'        THEN 'Plantas monstruo'
  WHEN 'Builders Club'         THEN 'Builders Club'
  WHEN 'Public Room Furni'     THEN 'Furnis de salas públicas'
  WHEN 'Classic Furni Lines'   THEN 'Líneas de furni clásicas'
  WHEN 'Seasonal Furni Lines'  THEN 'Líneas de furni de temporada'
  ELSE `caption`
END
WHERE `caption` IN (
  'Front Page','Furni','Clothing','Pets','Building','Credit Furni','Room Bundles',
  'Room Event','Limited Rares','Indoor Furni','Outdoor Furni','Room Building',
  'Furni By Line','Habbo Club','Wired','Bots','Game Shop','Habbo Groups','Music Shop',
  'Marketplace','Purchase History','Top Picks','New Additions','Outfits','Hairdos',
  'Hats','Accessories','Dresses','Shirts','Jackets','Trousers','Skirts','Shoes',
  'Effects','Temporary Effects','Pet Animals','Baby Pet Animals','Pet Equipment',
  'Breeding Boxes','Monster Plants','Builders Club','Public Room Furni',
  'Classic Furni Lines','Seasonal Furni Lines'
);
