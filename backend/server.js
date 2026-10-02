require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { pool, initDatabase } = require('./database');
const authRoutes = require('./api/auth');
const settingsRoutes = require('./api/settings');
const programsRoutes = require('./api/programs');
const plansRoutes = require('./api/plans');
const coachesRoutes = require('./api/coaches');
const pagesRoutes = require('./api/pages');
const homepageRoutes = require('./api/homepageSections');
const applicationsRoutes = require('./api/applications');
const contactsRoutes = require('./api/contacts');
const subscribersRoutes = require('./api/subscribers');
const templatesRoutes = require('./api/templates');
const automationsRoutes = require('./api/automations');
const mediaRoutes = require('./api/media');
const testimonialsRoutes = require('./api/testimonials');
const adminRoutes = require('./api/admin');
const integrationsRoutes = require('./api/integrations');
const navRoutes = require('./api/nav');
const dayPassesRoutes = require('./api/dayPasses');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 6435;

initDatabase();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/images', express.static(path.join(__dirname, '..', 'images')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/assets', express.static(path.join(__dirname, '..', 'admin', 'assets')));
app.use('/', express.static(path.join(__dirname, '..'), {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.includes('/backend/') || filePath.includes('package.json') || filePath.includes('.env')) {
      res.status(403).end();
    }
  }
}));

app.get('/api/settings/storefront', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/programs/storefront', async (req, res) => {
  try {
    const items = await pool.query('SELECT * FROM programs WHERE visibility = true ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plans/storefront', async (req, res) => {
  try {
    const items = await pool.query('SELECT * FROM plans WHERE visibility = true ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/coaches/storefront', async (req, res) => {
  try {
    const items = await pool.query('SELECT * FROM coaches WHERE visibility = true ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/testimonials/storefront', async (req, res) => {
  try {
    const items = await pool.query('SELECT * FROM testimonials WHERE visibility = true ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/nav/storefront', async (req, res) => {
  try {
    const mainNav = await pool.query("SELECT * FROM nav_items WHERE visibility = true AND position = 'main' ORDER BY sort_order ASC");
    const footerCols = await pool.query("SELECT * FROM nav_items WHERE visibility = true AND position IN ('footer', 'mobile') ORDER BY position, sort_order ASC");
    res.json({ main: mainNav.rows, footer: footerCols.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pages/storefront/:slug', async (req, res) => {
  try {
    const item = await pool.query('SELECT * FROM pages WHERE slug = $1 AND status = $2', [req.params.slug, 'published']);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/homepage-sections/storefront', async (req, res) => {
  try {
    const items = await pool.query('SELECT * FROM homepage_sections WHERE visibility = true ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/storefront/data', async (req, res) => {
  try {
    const [settings, programs, plans, coaches, homepage, testimonials, navMain, navFooter] = await Promise.all([
      pool.query('SELECT * FROM settings WHERE id = 1'),
      pool.query('SELECT * FROM programs WHERE visibility = true ORDER BY sort_order ASC, id ASC'),
      pool.query('SELECT * FROM plans WHERE visibility = true ORDER BY sort_order ASC, id ASC'),
      pool.query('SELECT * FROM coaches WHERE visibility = true ORDER BY sort_order ASC, id ASC'),
      pool.query('SELECT * FROM homepage_sections WHERE visibility = true ORDER BY sort_order ASC, id ASC'),
      pool.query('SELECT * FROM testimonials WHERE visibility = true ORDER BY sort_order ASC, id ASC'),
      pool.query("SELECT * FROM nav_items WHERE visibility = true AND position = 'main' ORDER BY sort_order ASC"),
      pool.query("SELECT * FROM nav_items WHERE visibility = true AND position IN ('footer', 'mobile') ORDER BY position, sort_order ASC")
    ]);
    res.json({
      settings: settings.rows[0] || {},
      programs: programs.rows,
      plans: plans.rows,
      coaches: coaches.rows,
      homepage,
      testimonials,
      nav: { main: navMain.rows, footer: navFooter.rows }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

authRoutes(app);
settingsRoutes(app);
programsRoutes(app);
plansRoutes(app);
coachesRoutes(app);
pagesRoutes(app);
homepageRoutes(app);
applicationsRoutes(app);
contactsRoutes(app);
subscribersRoutes(app);
templatesRoutes(app);
automationsRoutes(app);
mediaRoutes(app);
testimonialsRoutes(app);
navRoutes(app);
dayPassesRoutes(app);
adminRoutes(app);
integrationsRoutes(app);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

app.get(['/admin/login', '/admin/login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});

app.get(/^\/admin(.*)$/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

app.use((req, res) => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send('Not Found');
  });
});

app.use((err, req, res, next) => {
  console.error('ERROR:', req.method, req.url, err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const server = app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});

module.exports = app;
