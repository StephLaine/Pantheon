-- Quiz content (questions, answers, categories) for the Hermes chapter,
-- moved out of the 10 level screens' hardcoded arrays into real data.
-- Public read-only content — not user data, no RLS restriction by user.

create table quiz_categories (
  id          bigint generated always as identity primary key,
  level_n     int not null,
  key         text not null,
  label       text not null,
  icon        text not null,
  order_index int not null
);

create table quiz_questions (
  id            bigint generated always as identity primary key,
  level_n       int not null,
  category_id   bigint references quiz_categories(id) on delete cascade,
  format        text not null default 'qcm' check (format in ('qcm','tf')),
  prompt        text not null,
  choices       jsonb,
  correct_index int,
  correct_bool  boolean,
  order_index   int not null,
  check (
    (format = 'qcm' and choices is not null and correct_index is not null and correct_bool is null)
    or
    (format = 'tf' and choices is null and correct_bool is not null and correct_index is null)
  )
);
create index quiz_questions_level_idx on quiz_questions(level_n, order_index);
create index quiz_questions_category_idx on quiz_questions(category_id);

alter table quiz_categories enable row level security;
alter table quiz_questions enable row level security;
create policy quiz_categories_select_all on quiz_categories for select using (true);
create policy quiz_questions_select_all on quiz_questions for select using (true);

-- ============================================================
-- Level 1 — flat QCM (5)
-- ============================================================
insert into quiz_questions (level_n, format, prompt, choices, correct_index, order_index) values
(1, 'qcm', 'Combien de côtés a un triangle ?', '["2","3","4","5"]', 1, 0),
(1, 'qcm', 'Quelle est la capitale de la France ?', '["Lyon","Marseille","Paris","Nice"]', 2, 1),
(1, 'qcm', 'Quel est le plus grand océan du monde ?', '["Atlantique","Indien","Arctique","Pacifique"]', 3, 2),
(1, 'qcm', 'Combien font 5 × 6 ?', '["25","30","35","36"]', 1, 3),
(1, 'qcm', 'Quelle planète est surnommée la « planète rouge » ?', '["Vénus","Mars","Jupiter","Saturne"]', 1, 4);

-- ============================================================
-- Level 2 — categories (3 × 5 QCM)
-- ============================================================
insert into quiz_categories (level_n, key, label, icon, order_index) values
(2, 'sport', 'Sport', '⚽', 0),
(2, 'histoire', 'Histoire', '📜', 1),
(2, 'sciences', 'Sciences', '🔬', 2);

insert into quiz_questions (level_n, category_id, format, prompt, choices, correct_index, order_index)
select 2, c.id, 'qcm', q.prompt, q.choices::jsonb, q.correct_index, q.order_index
from quiz_categories c join (values
  ('Combien de joueurs une équipe de football aligne-t-elle sur le terrain ?', '["9","10","11","12"]', 2, 0),
  ('Tous les combien d''années ont lieu les Jeux Olympiques d''été ?', '["2","3","4","5"]', 2, 1),
  ('Quel pays a remporté la Coupe du Monde de football 2018 ?', '["Brésil","Allemagne","France","Argentine"]', 2, 2),
  ('Dans quel sport utilise-t-on un « volant » (birdie) ?', '["Golf","Tennis","Badminton","Squash"]', 2, 3),
  ('Combien de temps dure un match de basket-ball NBA (hors prolongations) ?', '["40 min","48 min","60 min","90 min"]', 1, 4)
) as q(prompt, choices, correct_index, order_index) on true
where c.level_n = 2 and c.key = 'sport';

insert into quiz_questions (level_n, category_id, format, prompt, choices, correct_index, order_index)
select 2, c.id, 'qcm', q.prompt, q.choices::jsonb, q.correct_index, q.order_index
from quiz_categories c join (values
  ('En quelle année a eu lieu la Révolution française ?', '["1789","1799","1804","1815"]', 0, 0),
  ('Qui fut le premier empereur de Rome ?', '["Jules César","Auguste","Néron","Trajan"]', 1, 1),
  ('Quel mur est tombé en 1989 ?', '["Le mur de Berlin","La Grande Muraille","Le mur d''Hadrien","La muraille de Chine"]', 0, 2),
  ('Quelle civilisation a construit les pyramides de Gizeh ?', '["Grecque","Romaine","Égyptienne","Maya"]', 2, 3),
  ('Qui a été le premier président des États-Unis ?', '["Lincoln","Jefferson","Washington","Adams"]', 2, 4)
) as q(prompt, choices, correct_index, order_index) on true
where c.level_n = 2 and c.key = 'histoire';

insert into quiz_questions (level_n, category_id, format, prompt, choices, correct_index, order_index)
select 2, c.id, 'qcm', q.prompt, q.choices::jsonb, q.correct_index, q.order_index
from quiz_categories c join (values
  ('Quelle est la formule chimique de l''eau ?', '["CO2","H2O","O2","NaCl"]', 1, 0),
  ('Combien de planètes compte notre système solaire ?', '["7","8","9","10"]', 1, 1),
  ('Quel organe pompe le sang dans le corps humain ?', '["Poumon","Foie","Cœur","Rein"]', 2, 2),
  ('Quelle est la vitesse de la lumière, arrondie ?', '["300 000 km/s","150 000 km/s","3 000 km/s","1 000 000 km/s"]', 0, 3),
  ('Quel gaz les plantes absorbent-elles pour la photosynthèse ?', '["Oxygène","Azote","CO2","Hydrogène"]', 2, 4)
) as q(prompt, choices, correct_index, order_index) on true
where c.level_n = 2 and c.key = 'sciences';

-- ============================================================
-- Level 3 — flat QCM (5)
-- ============================================================
insert into quiz_questions (level_n, format, prompt, choices, correct_index, order_index) values
(3, 'qcm', 'Combien de continents y a-t-il sur Terre ?', '["5","6","7","8"]', 2, 0),
(3, 'qcm', 'Quelle est la monnaie utilisée en Haïti ?', '["Le dollar","La gourde","L''euro","Le peso"]', 1, 1),
(3, 'qcm', 'Combien de jours compte une année bissextile ?', '["364","365","366","367"]', 2, 2),
(3, 'qcm', 'Quel est le plus long fleuve du monde ?', '["Le Nil","L''Amazone","Le Yangzi","Le Mississippi"]', 0, 3),
(3, 'qcm', 'Combien de côtés a un hexagone ?', '["5","6","7","8"]', 1, 4);

-- ============================================================
-- Level 4 — true/false (6)
-- ============================================================
insert into quiz_questions (level_n, format, prompt, correct_bool, order_index) values
(4, 'tf', 'Le soleil tourne autour de la Terre.', false, 0),
(4, 'tf', 'Paris est la capitale de la France.', true, 1),
(4, 'tf', 'Un triangle a quatre côtés.', false, 2),
(4, 'tf', 'L''eau bout à 100°C au niveau de la mer.', true, 3),
(4, 'tf', 'Les araignées sont des insectes.', false, 4),
(4, 'tf', 'Le cœur humain a quatre cavités.', true, 5);

-- ============================================================
-- Level 5 — pool QCM (10)
-- ============================================================
insert into quiz_questions (level_n, format, prompt, choices, correct_index, order_index) values
(5, 'qcm', 'Combien de zéros y a-t-il dans un million ?', '["4","5","6","7"]', 2, 0),
(5, 'qcm', 'Quelle est la plus grande planète du système solaire ?', '["Terre","Mars","Jupiter","Saturne"]', 2, 1),
(5, 'qcm', 'Combien de lettres compte l''alphabet français ?', '["24","25","26","27"]', 2, 2),
(5, 'qcm', 'Quel est le symbole chimique de l''or ?', '["Ag","Au","Fe","Pb"]', 1, 3),
(5, 'qcm', 'Combien de cordes une guitare classique a-t-elle ?', '["4","5","6","7"]', 2, 4),
(5, 'qcm', 'Quel est l''animal terrestre le plus rapide ?', '["Lion","Guépard","Cheval","Antilope"]', 1, 5),
(5, 'qcm', 'Combien de couleurs compte l''arc-en-ciel ?', '["5","6","7","8"]', 2, 6),
(5, 'qcm', 'Quelle est la capitale du Canada ?', '["Toronto","Montréal","Ottawa","Vancouver"]', 2, 7),
(5, 'qcm', 'Combien de dents un adulte humain a-t-il en moyenne ?', '["28","30","32","34"]', 2, 8),
(5, 'qcm', 'Quel est le plus petit pays du monde ?', '["Monaco","Vatican","Malte","Andorre"]', 1, 9);

-- ============================================================
-- Level 6 — flat QCM (7), Wall 1
-- ============================================================
insert into quiz_questions (level_n, format, prompt, choices, correct_index, order_index) values
(6, 'qcm', '2 + 2 = ?', '["3","4","5","6"]', 1, 0),
(6, 'qcm', 'De quelle couleur est le ciel par temps clair ?', '["Rouge","Bleu","Vert","Jaune"]', 1, 1),
(6, 'qcm', 'Combien de jours y a-t-il dans une semaine ?', '["5","6","7","8"]', 2, 2),
(6, 'qcm', 'Quel est le contraire de « chaud » ?', '["Tiède","Froid","Doux","Sec"]', 1, 3),
(6, 'qcm', 'Combien de pattes une araignée a-t-elle ?', '["6","8","10","12"]', 1, 4),
(6, 'qcm', 'Quelle est la capitale de l''Italie ?', '["Milan","Rome","Venise","Naples"]', 1, 5),
(6, 'qcm', '1 + 1 = ?', '["1","2","3","4"]', 1, 6);

-- ============================================================
-- Level 7 — categories (3 × 5 QCM)
-- ============================================================
insert into quiz_categories (level_n, key, label, icon, order_index) values
(7, 'sport', 'Sport', '⚽', 0),
(7, 'histoire', 'Histoire', '📜', 1),
(7, 'sciences', 'Sciences', '🔬', 2);

insert into quiz_questions (level_n, category_id, format, prompt, choices, correct_index, order_index)
select 7, c.id, 'qcm', q.prompt, q.choices::jsonb, q.correct_index, q.order_index
from quiz_categories c join (values
  ('Combien de sets faut-il gagner pour remporter un match de tennis en Grand Chelem (hommes) ?', '["2","3","4","5"]', 1, 0),
  ('Dans quel sport peut-on marquer un « ace » ?', '["Golf","Tennis","Boxe","Rugby"]', 1, 1),
  ('Combien d''anneaux compte le logo olympique ?', '["3","4","5","6"]', 2, 2),
  ('Quel pays a inventé le judo ?', '["Chine","Japon","Corée","Thaïlande"]', 1, 3),
  ('Combien de joueurs une équipe de volley-ball aligne-t-elle sur le terrain ?', '["5","6","7","8"]', 1, 4)
) as q(prompt, choices, correct_index, order_index) on true
where c.level_n = 7 and c.key = 'sport';

insert into quiz_questions (level_n, category_id, format, prompt, choices, correct_index, order_index)
select 7, c.id, 'qcm', q.prompt, q.choices::jsonb, q.correct_index, q.order_index
from quiz_categories c join (values
  ('Qui a peint la Joconde ?', '["Michel-Ange","Léonard de Vinci","Raphaël","Donatello"]', 1, 0),
  ('En quelle année l''homme a-t-il marché sur la Lune pour la première fois ?', '["1965","1969","1972","1959"]', 1, 1),
  ('Quel roi français est surnommé le « Roi Soleil » ?', '["Louis XIV","Louis XVI","François Ier","Henri IV"]', 0, 2),
  ('Quelle ancienne civilisation a construit le Machu Picchu ?', '["Aztèque","Maya","Inca","Olmèque"]', 2, 3),
  ('Qui a rédigé la Déclaration d''indépendance des États-Unis ?', '["Lincoln","Jefferson","Franklin","Washington"]', 1, 4)
) as q(prompt, choices, correct_index, order_index) on true
where c.level_n = 7 and c.key = 'histoire';

insert into quiz_questions (level_n, category_id, format, prompt, choices, correct_index, order_index)
select 7, c.id, 'qcm', q.prompt, q.choices::jsonb, q.correct_index, q.order_index
from quiz_categories c join (values
  ('Combien d''os compte le corps humain adulte ?', '["186","206","226","246"]', 1, 0),
  ('Quelle est l''unité de mesure de la force ?', '["Watt","Newton","Joule","Pascal"]', 1, 1),
  ('Quel est le plus grand organe du corps humain ?', '["Foie","Cerveau","Peau","Cœur"]', 2, 2),
  ('Quelle planète est la plus proche du Soleil ?', '["Vénus","Mercure","Mars","Terre"]', 1, 3),
  ('Combien de chromosomes une cellule humaine possède-t-elle ?', '["23","46","44","48"]', 1, 4)
) as q(prompt, choices, correct_index, order_index) on true
where c.level_n = 7 and c.key = 'sciences';

-- ============================================================
-- Level 8 — pool QCM (10)
-- ============================================================
insert into quiz_questions (level_n, format, prompt, choices, correct_index, order_index) values
(8, 'qcm', 'Combien de minutes y a-t-il dans une heure ?', '["50","60","70","100"]', 1, 0),
(8, 'qcm', 'Quelle est la langue la plus parlée au monde (locuteurs natifs) ?', '["Anglais","Mandarin","Espagnol","Hindi"]', 1, 1),
(8, 'qcm', 'Quel est le plus grand désert chaud du monde ?', '["Gobi","Sahara","Kalahari","Atacama"]', 1, 2),
(8, 'qcm', 'Combien de faces un cube a-t-il ?', '["4","5","6","8"]', 2, 3),
(8, 'qcm', 'Quel est l''os le plus long du corps humain ?', '["Tibia","Fémur","Humérus","Radius"]', 1, 4),
(8, 'qcm', 'Quelle est la capitale de l''Espagne ?', '["Barcelone","Madrid","Séville","Valence"]', 1, 5),
(8, 'qcm', 'Combien de temps la Terre met-elle à faire un tour sur elle-même ?', '["12h","24h","48h","365j"]', 1, 6),
(8, 'qcm', 'Quel est le symbole chimique du fer ?', '["Fe","Ir","Fr","Fi"]', 0, 7),
(8, 'qcm', 'Combien de cœurs une pieuvre a-t-elle ?', '["1","2","3","4"]', 2, 8),
(8, 'qcm', 'Quelle est la plus haute montagne du monde ?', '["K2","Everest","Kilimandjaro","Mont Blanc"]', 1, 9);

-- ============================================================
-- Level 9 — flat QCM (5), Wall 2
-- ============================================================
insert into quiz_questions (level_n, format, prompt, choices, correct_index, order_index) values
(9, 'qcm', 'Combien de côtés un carré a-t-il ?', '["3","4","5","6"]', 1, 0),
(9, 'qcm', 'Quelles couleurs compose le drapeau haïtien ?', '["Rouge et bleu","Vert et blanc","Noir et jaune","Bleu et blanc"]', 0, 1),
(9, 'qcm', 'Combien font 10 − 4 ?', '["5","6","7","8"]', 1, 2),
(9, 'qcm', 'Quel est le premier mois de l''année ?', '["Décembre","Janvier","Février","Mars"]', 1, 3),
(9, 'qcm', 'Combien de roues une bicyclette a-t-elle ?', '["1","2","3","4"]', 1, 4);

-- ============================================================
-- Level 10 — mixed qcm/tf (6), finale
-- ============================================================
insert into quiz_questions (level_n, format, prompt, choices, correct_index, order_index) values
(10, 'qcm', 'Quelle est la capitale d''Haïti ?', '["Cap-Haïtien","Port-au-Prince","Jacmel","Gonaïves"]', 1, 0),
(10, 'qcm', 'Combien de côtés un pentagone a-t-il ?', '["4","5","6","7"]', 1, 1),
(10, 'qcm', 'Quel est le plus grand pays du monde par superficie ?', '["Chine","Canada","Russie","États-Unis"]', 2, 4),
(10, 'qcm', 'En quelle année Haïti a-t-il proclamé son indépendance ?', '["1789","1804","1815","1848"]', 1, 5);

insert into quiz_questions (level_n, format, prompt, correct_bool, order_index) values
(10, 'tf', 'L''ADN se trouve dans le noyau de la cellule.', true, 2),
(10, 'tf', 'Le Brésil se trouve en Afrique.', false, 3);
