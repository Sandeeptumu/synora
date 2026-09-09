CREATE TABLE IF NOT EXISTS voice_recordings (checkin_id uuid PRIMARY KEY REFERENCES checkins(id), audio bytea NOT NULL, content_type varchar(96) NOT NULL);
