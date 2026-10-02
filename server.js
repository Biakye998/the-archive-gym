const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool, initDatabase } = require('./backend/database');

const authRoutes = require('./backend/api/auth');
const settingsRoutes = require('./backend/api/settings');
const programsRoutes = require('./backend/api/programs');
const plansRoutes = require('./backend/api/plans');
const coachesRoutes = require('./backend/api/coaches');
const pagesRoutes = require('./backend/api/pages');
const homepageRoutes = require('./backend/api/homepageSections');
const applicationsRoutes = require('./backend/api/applications');
const contactsRoutes = require('./backend/api/contacts');
const subscribersRoutes = require('./backend/api/subscribers');
const templatesRoutes = require('./backend/api/templates');
const automationsRoutes = require('./backend/api/automations');
const mediaRoutes = require('./backend/api/media');
const testimonialsRoutes = require('./backend/api/testimonials');
const navRoutes = require('./backend/api/nav');
const dayPassesRoutes = require('./backend/api/dayPasses');
const adminRoutes = require('./backend/api/admin');
const integrationsRoutes = require('./backend/api/integrations');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 6435;

initDatabase();

app.use(require('cors')());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/assets', express.static(path.join(__dirname, 'admin', 'assets')));
app.use('/', express.static(__dirname, {
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
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get(['/admin/login', '/admin/login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get(/^\/admin(.*)$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.use((req, res) => {
  let filePath = req.url.split('?')[0];
  filePath = filePath === '/' ? '/index.html' : filePath;
  let fullPath = path.join(__dirname, filePath);

  const ext = path.extname(fullPath);
  const extensions = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };
  const contentType = extensions[ext] || 'text/html; charset=utf-8';

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});

module.exports = app;
