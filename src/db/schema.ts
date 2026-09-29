export const SCHEMA_VERSION = 2;

export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  nameLatin TEXT,
  tradition TEXT NOT NULL DEFAULT 'persian',
  kind TEXT NOT NULL DEFAULT 'person',
  born TEXT,
  died TEXT,
  instruments TEXT,
  bio TEXT,
  photo TEXT,
  cover TEXT,
  gallery TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  titleLatin TEXT,
  tradition TEXT NOT NULL DEFAULT 'persian',
  form TEXT,
  catalog TEXT,
  dastgah TEXT,
  avaz TEXT,
  gousheh TEXT,
  year TEXT,
  lyrics TEXT,
  description TEXT,
  poster TEXT,
  sheetImages TEXT NOT NULL DEFAULT '[]',
  sheetText TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  year TEXT,
  label TEXT,
  cover TEXT,
  notes TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  workId TEXT REFERENCES works(id) ON DELETE SET NULL,
  albumId TEXT REFERENCES albums(id) ON DELETE SET NULL,
  discNo INTEGER,
  trackNo INTEGER,
  audioUri TEXT,
  originalName TEXT,
  format TEXT,
  sampleRate INTEGER,
  bitDepth INTEGER,
  channels INTEGER,
  duration REAL,
  year TEXT,
  cover TEXT,
  lyrics TEXT,
  notes TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  rating REAL,
  playCount INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY NOT NULL,
  artistId TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  instrument TEXT,
  workId TEXT REFERENCES works(id) ON DELETE CASCADE,
  recordingId TEXT REFERENCES recordings(id) ON DELETE CASCADE,
  albumId TEXT REFERENCES albums(id) ON DELETE CASCADE,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY NOT NULL,
  fromId TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  toId TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  note TEXT,
  createdAt INTEGER NOT NULL,
  UNIQUE (fromId, toId, kind)
);

CREATE TABLE IF NOT EXISTS timeline (
  id TEXT PRIMARY KEY NOT NULL,
  artistId TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  date TEXT,
  title TEXT NOT NULL,
  description TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  mood TEXT,
  recordingId TEXT REFERENCES recordings(id) ON DELETE SET NULL,
  workId TEXT REFERENCES works(id) ON DELETE SET NULL,
  artistId TEXT REFERENCES artists(id) ON DELETE SET NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY NOT NULL,
  recordingId TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  playedAt INTEGER NOT NULL,
  listened REAL NOT NULL DEFAULT 0,
  completion REAL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_items (
  collectionId TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  recordingId TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (collectionId, recordingId)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_rec_work ON recordings (workId);
CREATE INDEX IF NOT EXISTS idx_rec_album ON recordings (albumId, discNo, trackNo);
CREATE INDEX IF NOT EXISTS idx_credit_artist ON credits (artistId);
CREATE INDEX IF NOT EXISTS idx_credit_work ON credits (workId);
CREATE INDEX IF NOT EXISTS idx_credit_rec ON credits (recordingId);
CREATE INDEX IF NOT EXISTS idx_credit_album ON credits (albumId);
CREATE INDEX IF NOT EXISTS idx_rel_from ON relations (fromId);
CREATE INDEX IF NOT EXISTS idx_rel_to ON relations (toId);
CREATE INDEX IF NOT EXISTS idx_hist_played ON history (playedAt DESC);
CREATE INDEX IF NOT EXISTS idx_journal_created ON journal (createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_artist ON timeline (artistId, date);
`;

/** v2: picture-poems (postcards) and saved conversations with the companion. */
export const SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS postcards (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  recordingId TEXT REFERENCES recordings(id) ON DELETE SET NULL,
  workId TEXT REFERENCES works(id) ON DELETE SET NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  preview TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_postcards_updated ON postcards (updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations (updatedAt DESC);
`;
