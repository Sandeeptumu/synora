BEGIN;
CREATE TABLE IF NOT EXISTS staff_invitations (email varchar(180) PRIMARY KEY, role varchar(32) NOT NULL);
UPDATE users SET role='ADMIN' WHERE lower(email)='tumusandeep0000@gmail.com';
INSERT INTO staff_invitations(email,role)
SELECT 'tumusandeep0000@gmail.com','ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email)='tumusandeep0000@gmail.com')
ON CONFLICT (email) DO NOTHING;
COMMIT;
