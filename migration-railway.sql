-- Migration pour ajouter les nouveaux champs au schéma
-- À exécuter sur la base de données Railway

-- Ajouter les champs profileColor et jobTitle à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profileColor VARCHAR(7) DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS jobTitle VARCHAR(100);

-- Vérifier que les modifications ont été appliquées
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'users' 
AND COLUMN_NAME IN ('profileColor', 'jobTitle');

