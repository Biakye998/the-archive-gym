const serverless = require('serverless-http');
const express = require('express');
const { initDatabase } = require('./database');
const path = require('path');

const app = express();
const fs = require('fs');

initDatabase();

app.use(require('cors')());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
const navRoutes = require('./api/nav');
const dayPassesRoutes = require('./api/dayPasses');
const adminRoutes = require('./api/admin');
const integrationsRoutes = require('./api/integrations');

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

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

exports.handler = serverless(app);
