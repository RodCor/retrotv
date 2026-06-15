-- RetroTV: website content posts (Comunidad news + Competiciones announcements).
-- One table, two categories, managed from the CRM and shown on the public site.
CREATE TABLE IF NOT EXISTS cms_posts (
  id          INT(11)       NOT NULL AUTO_INCREMENT,
  category    ENUM('news','competition') NOT NULL DEFAULT 'news',
  title       VARCHAR(140)  NOT NULL,
  excerpt     VARCHAR(300)  NOT NULL DEFAULT '',
  body        TEXT          NOT NULL,
  image       VARCHAR(300)  NOT NULL DEFAULT '',
  label       VARCHAR(40)   NOT NULL DEFAULT '',   -- small tag, e.g. "Evento", "Torneo"
  pinned      TINYINT(1)    NOT NULL DEFAULT 0,
  visible     TINYINT(1)    NOT NULL DEFAULT 1,
  author      VARCHAR(64)   NOT NULL DEFAULT 'Equipo RetroTV',
  starts_at   DATETIME      NULL DEFAULT NULL,      -- when a competition runs
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_feed (category, visible, pinned, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed content so the sections look alive on first launch (id-guarded, re-runnable).
INSERT INTO cms_posts (id, category, title, excerpt, body, label, pinned, author) VALUES
 (1,'news','¡Bienvenido a RetroTV!',
  'Abrimos las puertas del hotel retro más acogedor. Crea tu habbo, diseña salas y haz amigos.',
  'RetroTV es un hotel retro hecho por y para fans. Regístrate gratis, personaliza tu avatar, construye tus salas con miles de furnis y forma parte de una comunidad que crece cada día. ¡Te esperamos dentro!',
  'Anuncio',1,'Equipo RetroTV'),
 (2,'news','Catálogo renovado: cientos de furnis nuevos',
  'Hemos añadido packs clásicos y rares al catálogo. Pásate por la tienda y renueva tus salas.',
  'El catálogo se ha ampliado con líneas clásicas, rares y temporadas. Encuentra las piezas perfectas para tus proyectos y presume de la colección más espectacular del hotel.',
  'Catálogo',0,'Equipo RetroTV'),
 (3,'news','Normas y buen rollo',
  'Mantengamos RetroTV un sitio sano y divertido para todos. Lee las normas básicas de convivencia.',
  'El respeto es lo primero. Nada de spam, insultos ni trampas. El equipo de moderación está para ayudarte: si necesitas algo, abre un ticket desde el hotel.',
  'Comunidad',0,'Moderación');

INSERT INTO cms_posts (id, category, title, excerpt, body, label, pinned, author, starts_at) VALUES
 (4,'competition','Concurso de diseño de salas',
  'Construye la sala más original del mes y gana un pack de rares exclusivo.',
  'Tema libre. Sube tu sala a público, ponle un nombre que empiece por [RTV] y el equipo elegirá las tres mejores. Premios en créditos, diamantes y un rare conmemorativo.',
  'Concurso',1,'Eventos', DATE_ADD(NOW(), INTERVAL 3 DAY)),
 (5,'competition','Torneo de BattleBall',
  'El clásico vuelve al hotel. Inscríbete y demuestra quién manda en el tablero.',
  'Eliminatorias por rondas en las salas oficiales de juego. Cupos limitados — atento al chat del hotel para apuntarte. ¡Que gane el mejor!',
  'Torneo',0,'Eventos', DATE_ADD(NOW(), INTERVAL 7 DAY)),
 (6,'competition','Búsqueda del tesoro semanal',
  'Cada semana escondemos un furni raro por el hotel. El primero en encontrarlo se lo queda.',
  'Sigue las pistas que publicaremos en Comunidad. Rapidez y astucia: solo hay un ganador por semana. ¿Serás tú?',
  'Evento',0,'Eventos', DATE_ADD(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE title=VALUES(title);
