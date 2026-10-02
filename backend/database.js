require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'archive-gym-secret-change-in-production';

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT DEFAULT 'THE ARCHIVE',
  business_tagline TEXT DEFAULT 'Premium Fitness Institution',
  logo TEXT,
  favicon TEXT,
  site_title TEXT DEFAULT 'THE ARCHIVE — Premium Fitness Institution',
  site_description TEXT DEFAULT 'THE ARCHIVE is a premium fitness institution built for those who take performance, discipline, and lifestyle seriously.',
  contact_email TEXT DEFAULT 'applications@thearchive.ch',
  contact_phone TEXT DEFAULT '+41 81 123 4567',
  address TEXT DEFAULT 'Via Plinio 99, 7746 St. Moritz, Switzerland',
  business_hours TEXT,
  timezone TEXT DEFAULT 'Europe/Zurich',
  currency_code TEXT DEFAULT 'CHF',
  currency_symbol TEXT DEFAULT 'CFA',
  language TEXT DEFAULT 'en',
  website_url TEXT DEFAULT 'https://thearchive.ch',
  copyright_text TEXT DEFAULT 'THE ARCHIVE — 2024',
  social_links TEXT DEFAULT '{"instagram":"https://instagram.com/thearchive","youtube":"https://youtube.com/thearchive","twitter":"https://twitter.com/thearchive"}',
  seo_global_title TEXT,
  seo_global_description TEXT,
  seo_og_image TEXT,
  cookie_consent_enabled BOOLEAN DEFAULT true,
  cookie_consent_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  template TEXT DEFAULT 'default',
  content_sections TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  full_description TEXT,
  difficulty TEXT,
  duration TEXT,
  frequency TEXT,
  image TEXT,
  benefits TEXT,
  cta_text TEXT DEFAULT 'APPLY NOW',
  cta_destination TEXT,
  visibility BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency_code TEXT DEFAULT 'CHF',
  currency_symbol TEXT DEFAULT 'CFA',
  billing_period TEXT DEFAULT 'month',
  badge_text TEXT,
  is_featured BOOLEAN DEFAULT false,
  benefits TEXT,
  cta_text TEXT DEFAULT 'SELECT',
  cta_destination TEXT,
  visibility BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coaches (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  credentials TEXT,
  image TEXT,
  specialties TEXT,
  social_links TEXT,
  visibility BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id SERIAL PRIMARY KEY,
  section_key TEXT UNIQUE NOT NULL,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  content_json TEXT,
  visibility BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  quote TEXT,
  image TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visibility BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'manager', 'content_manager', 'communications_manager')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  inquiry_type TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  age INTEGER,
  plan_id INTEGER,
  program_id INTEGER,
  goals TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'contacted', 'approved', 'rejected', 'completed')),
  internal_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  consent_status TEXT DEFAULT 'granted' CHECK (consent_status IN ('granted', 'denied')),
  consent_date TIMESTAMP,
  signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribe_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('customer', 'admin', 'newsletter')),
  subject TEXT,
  html_content TEXT,
  text_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automations (
  id SERIAL PRIMARY KEY,
  trigger_event TEXT NOT NULL,
  template_id INTEGER,
  channel TEXT CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
  is_enabled BOOLEAN DEFAULT true,
  conditions_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT,
  path TEXT NOT NULL,
  size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  used_in TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_configs (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('email', 'sms', 'payment', 'analytics', 'crm', 'calendar', 'maps', 'social', 'storage')),
  config_json TEXT,
  status TEXT DEFAULT 'not_configured' CHECK (status IN ('not_configured', 'configured', 'connected', 'error', 'disabled')),
  last_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nav_items (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  position TEXT DEFAULT 'main' CHECK (position IN ('main', 'mobile', 'footer')),
  section_name TEXT,
  sort_order INTEGER DEFAULT 0,
  visibility BOOLEAN DEFAULT true
);

   CREATE TABLE IF NOT EXISTS footer_columns (
  id SERIAL PRIMARY KEY,
  column_key TEXT NOT NULL,
  title TEXT,
  link_ids TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS day_pass_requests (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  visit_date DATE,
  visit_time TEXT,
  guests INTEGER DEFAULT 0,
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'cancelled', 'completed')),
  internal_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function initDatabase() {
  try {
    await pool.query(SCHEMA_SQL);
    const settingsCheck = await pool.query('SELECT id FROM settings WHERE id = 1');
    if (settingsCheck.rows.length === 0) {
      await pool.query('INSERT INTO settings (id, business_name) VALUES (1, $1)', ['THE ARCHIVE']);
    }
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    process.exit(1);
  }
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

async function auditLog(client, adminId, action, entityType, entityId, details) {
  const detailStr = typeof details === 'object' && details !== null ? JSON.stringify(details) : details;
  const query = adminId
    ? 'INSERT INTO audit_log (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)'
    : 'INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4)';
  const params = adminId
    ? [adminId, action, entityType || null, entityId || null, detailStr || null]
    : [action, entityType || null, entityId || null, detailStr || null];
  if (client) {
    await client.query(query, params);
  } else {
    await pool.query(query, params);
  }
}

module.exports = {
  pool,
  initDatabase,
  generateToken,
  auditLog,
  JWT_SECRET
};
