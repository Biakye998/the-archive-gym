require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initDatabase } = require('./database');

async function seed() {
  await initDatabase();

  const seedAdminUser = async () => {
    const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', ['admin@thearchive.ch']);
    if (!existing.rows[0]) {
      const passwordHash = bcrypt.hashSync('archive2024', 10);
      await pool.query('INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3)',
        ['admin@thearchive.ch', passwordHash, 'owner']);
      console.log('Created admin user: admin@thearchive.ch (password: archive2024)');
    }
  };

  const seedSettings = async () => {
    const existing = await pool.query('SELECT id FROM settings WHERE id = 1');
    if (!existing.rows[0]) {
      await pool.query(`
        INSERT INTO settings (id, business_name, business_tagline, site_title, site_description,
          contact_email, contact_phone, address, timezone, currency_code, currency_symbol, language,
          website_url, copyright_text, social_links, business_hours, cookie_consent_enabled)
        VALUES (1, 'THE ARCHIVE', 'Premium Fitness Institution', 'THE ARCHIVE — Premium Fitness Institution',
          'THE ARCHIVE is a premium fitness institution built for those who take performance, discipline, and lifestyle seriously.',
          'applications@thearchive.ch', '+41 81 123 4567', 'Via Plinio 99, 7746 St. Moritz, Switzerland',
          'Europe/Zurich', 'CHF', 'CFA', 'en', 'https://thearchive.ch', 'THE ARCHIVE — 2024',
          '{"instagram":"https://instagram.com/thearchive","youtube":"https://youtube.com/thearchive","twitter":"https://twitter.com/thearchive"}',
          '{"mon_fri":"6am-11pm","sat_sun":"7am-11pm"}', true)
      `);
      console.log('Seeded settings');
    }
  };

  const seedPrograms = async () => {
    const count = (await pool.query('SELECT COUNT(*) FROM programs')).rows[0].count;
    if (parseInt(count) === 0) {
      const programs = [
        { slug: 'strength', title: 'Strength', description: 'Traditional and conjugate methods to build maximal strength through compound movements.', full_description: 'Our Strength program uses traditional and conjugate methods led by USAPL-certified coaches.', difficulty: 'All Levels', duration: '8-12 weeks', frequency: '3x/week', image: 'images/training/strength-1.jpg', benefits: '["Proper barbell technique","Periodized programming","Competition prep support","Form assessment"]', cta_text: 'APPLY NOW', cta_destination: 'join.html?program=strength', sort_order: 1 },
        { slug: 'pt', title: 'Personal Training', description: 'One-on-one coaching with elite coaches, tailored to your specific goals and limitations.', full_description: 'Our Personal Training program pairs you with an elite coach for one-on-one sessions.', difficulty: 'Any Level', duration: '12+ weeks', frequency: '1:1 sessions', image: 'images/training/strength-2.jpg', benefits: '["Custom program design","Progress tracking","Weekly adjustments","Technique feedback"]', cta_text: 'APPLY NOW', cta_destination: 'join.html?program=pt', sort_order: 2 },
        { slug: 'group', title: 'Group Training', description: 'Small-group sessions with a rotating focus, from metabolic conditioning to skill development.', full_description: 'Our Group Training sessions cap at 5 participants per class.', difficulty: 'Intermediate', duration: 'Ongoing', frequency: '4x/week', image: 'images/training/strength-3.jpg', benefits: '["Metabolic conditioning","Skill development","Community motivation","Structured progression"]', cta_text: 'APPLY NOW', cta_destination: 'join.html?program=group', sort_order: 3 },
        { slug: 'recovery', title: 'Recovery', description: 'Essential recovery protocols including contrast therapy, compression, and guided mobility work.', full_description: 'At THE ARCHIVE, recovery is considered an essential part of performance.', difficulty: 'All Members', duration: 'Unlimited access', frequency: 'Included', image: 'images/lifestyle/lifestyle-1.jpg', benefits: '["Cryotherapy (-196C)","Infrared Sauna","Contrast Therapy","Guided Mobility"]', cta_text: 'APPLY NOW', cta_destination: 'join.html?program=recovery', sort_order: 4 }
      ];
      const stmt = 'INSERT INTO programs (slug, title, description, full_description, difficulty, duration, frequency, image, benefits, cta_text, cta_destination, visibility, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)';
      const insert = pool.connect();
      for (const p of programs) {
        await pool.query(stmt, [p.slug, p.title, p.description, p.full_description, p.difficulty, p.duration, p.frequency, p.image, p.benefits, p.cta_text, p.cta_destination, p.sort_order]);
      }
      console.log('Seeded 4 programs');
    }
  };

  const seedPlans = async () => {
    const count = (await pool.query('SELECT COUNT(*) FROM plans')).rows[0].count;
    if (parseInt(count) === 0) {
      const plans = [
        { slug: 'core', title: 'Core', description: 'Full facility access, standard equipment, 24/7 entry.', price: 149, currency_code: 'CHF', currency_symbol: 'CFA', billing_period: 'month', benefits: '["24/7 facility access","Standard equipment","Members-only community","Locker room and amenities"]', cta_text: 'SELECT', cta_destination: 'core.html', sort_order: 1 },
        { slug: 'performance', title: 'Performance', description: 'Core access plus personal training sessions and quarterly assessments.', price: 349, currency_code: 'CHF', currency_symbol: 'CFA', billing_period: 'month', badge_text: 'MOST POPULAR', is_featured: true, benefits: '["Everything in Core","4 personal training sessions/mo","Quarterly performance review","Program customization"]', cta_text: 'SELECT', cta_destination: 'performance.html', sort_order: 2 },
        { slug: 'archive', title: 'Archive', description: 'The complete experience: unlimited coaching, priority recovery, and dedicated support.', price: 749, currency_code: 'CHF', currency_symbol: 'CFA', billing_period: 'month', badge_text: 'FULL EXPERIENCE', benefits: '["Everything in Performance","Unlimited personal training","Priority recovery & nutrition","Dedicated coach availability"]', cta_text: 'SELECT', cta_destination: 'archive.html', sort_order: 3 }
      ];
      const stmt = 'INSERT INTO plans (slug, title, description, price, currency_code, currency_symbol, billing_period, badge_text, is_featured, benefits, cta_text, cta_destination, visibility, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13)';
      for (const p of plans) {
        await pool.query(stmt, [p.slug, p.title, p.description, p.price, p.currency_code, p.currency_symbol, p.billing_period, p.badge_text, p.is_featured, p.benefits, p.cta_text, p.cta_destination, p.sort_order]);
      }
      console.log('Seeded 3 plans');
    }
  };

  const seedCoaches = async () => {
    const count = (await pool.query('SELECT COUNT(*) FROM coaches')).rows[0].count;
    if (parseInt(count) === 0) {
      const coaches = [
        { slug: 'marco-rebula', name: 'Marco Rebula', title: 'Head Coach — Strength', bio: 'Marco leads our strength program with competition-tested methods. His athletes have won national championships across three weight classes.', credentials: 'USAPL Elite Coach, IPF Category 1 Referee, 12x Swiss National Record Holder', image: 'images/training/strength-1.jpg', specialties: '["Strength Training","Powerlifting","Competition Prep"]', social_links: '{"instagram":"https://instagram.com/marcorebula","twitter":"https://twitter.com/marcorebula"}', sort_order: 1 },
        { slug: 'elena-vasquez', name: 'Elena Vasquez', title: 'Director — Performance', bio: 'Elena oversees our performance and conditioning programs. Her approach blends exercise science with practical athletic development.', credentials: 'CrossFit Level 3, BSc Exercise Science, Regional Team Champion 2021', image: 'images/training/strength-2.jpg', specialties: '["Performance Coaching","Conditioning","Program Design"]', social_links: '{"instagram":"https://instagram.com/elenavasquez"}', sort_order: 2 },
        { slug: 'david-kohler', name: 'David Kohler', title: 'Head — Recovery', bio: 'David manages our recovery suite and brings clinical expertise to every session. His focus is on evidence-based recovery protocols.', credentials: 'Physiotherapy (ETH Zurich), Certified Massage Therapist, Cryotherapy Specialist Level 3', image: 'images/lifestyle/lifestyle-1.jpg', specialties: '["Recovery Therapy","Cryotherapy","Mobility"]', social_links: '{"instagram":"https://instagram.com/davidkohler"}', sort_order: 3 }
      ];
      for (const c of coaches) {
        await pool.query('INSERT INTO coaches (slug, name, title, bio, credentials, image, specialties, social_links, visibility, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)',
          [c.slug, c.name, c.title, c.bio, c.credentials, c.image, c.specialties, c.social_links, c.sort_order]);
      }
      console.log('Seeded 3 coaches');
    }
  };

  const seedNav = async () => {
    const count = (await pool.query('SELECT COUNT(*) FROM nav_items')).rows[0].count;
    if (parseInt(count) === 0) {
      const items = [
        { label: 'HOME', url: 'index.html', position: 'main', section_name: 'home', sort_order: 1 },
        { label: 'TRAINING', url: 'training.html', position: 'main', section_name: 'training', sort_order: 2 },
        { label: 'MEMBERSHIP', url: 'membership.html', position: 'main', section_name: 'membership', sort_order: 3 },
        { label: 'ABOUT', url: 'about.html', position: 'main', section_name: 'about', sort_order: 4 },
        { label: 'COACHES', url: 'trainers.html', position: 'main', section_name: 'trainers', sort_order: 5 },
        { label: 'DAY PASS', url: 'day-pass.html', position: 'main', section_name: 'day-pass', sort_order: 6 },
        { label: 'CONTACT', url: 'contact.html', position: 'main', section_name: 'contact', sort_order: 7 },
        { label: 'JOIN NOW', url: 'join.html', position: 'main', section_name: 'join', sort_order: 8 },
        { label: 'Training Programs', url: 'training.html', position: 'footer', section_name: 'training', sort_order: 1 },
        { label: 'Membership Plans', url: 'membership.html', position: 'footer', section_name: 'membership', sort_order: 2 },
        { label: 'Our Coaches', url: 'trainers.html', position: 'footer', section_name: 'trainers', sort_order: 3 },
        { label: 'Contact Us', url: 'contact.html', position: 'footer', section_name: 'contact', sort_order: 4 },
        { label: 'Privacy', url: 'privacy.html', position: 'footer', section_name: 'privacy', sort_order: 5 },
        { label: 'Terms', url: 'terms.html', position: 'footer', section_name: 'terms', sort_order: 6 }
      ];
      for (const i of items) {
        await pool.query('INSERT INTO nav_items (label, url, position, section_name, sort_order, visibility) VALUES ($1, $2, $3, $4, $5, true)',
          [i.label, i.url, i.position, i.section_name, i.sort_order]);
      }
      console.log('Seeded 13 nav items');
    }
  };

  const seedTemplates = async () => {
    const count = (await pool.query('SELECT COUNT(*) FROM templates')).rows[0].count;
    if (parseInt(count) === 0) {
      const templates = [
        { template_key: 'welcome', name: 'Welcome Email', category: 'customer', subject: 'Welcome to THE ARCHIVE', html_content: '<h1>Welcome to THE ARCHIVE</h1><p>Thank you for your interest in our gym.</p>', text_content: 'Welcome to THE ARCHIVE\nThank you for your interest in our gym.', is_active: true },
        { template_key: 'application_received', name: 'Application Received', category: 'customer', subject: 'Application Received — THE ARCHIVE', html_content: '<h1>Application Received</h1><p>We have received your membership application and will contact you within 24 hours.</p>', text_content: 'Application Received\nWe have received your membership application.', is_active: true },
        { template_key: 'application_approved', name: 'Application Approved', category: 'customer', subject: 'Application Approved — THE ARCHIVE', html_content: '<h1>Application Approved</h1><p>Your membership application has been approved.</p>', text_content: 'Application Approved\nYour membership application has been approved.', is_active: true },
        { template_key: 'contact_received', name: 'Contact Form Submission', category: 'admin', subject: 'New Contact Submission', html_content: '<h1>New Contact Submission</h1><p>A new contact form submission has been received.</p>', text_content: 'New Contact Submission\nA new contact form submission has been received.', is_active: true }
      ];
      for (const t of templates) {
        await pool.query('INSERT INTO templates (template_key, name, category, subject, html_content, text_content, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [t.template_key, t.name, t.category, t.subject, t.html_content, t.text_content, t.is_active]);
      }
      console.log('Seeded 4 templates');
    }
  };

  const seedAutomations = async () => {
    const count = (await pool.query('SELECT COUNT(*) FROM automations')).rows[0].count;
    if (parseInt(count) === 0) {
      const automations = [
        { trigger_event: 'application_submitted', template_id: 2, channel: 'email', conditions_json: '{}' },
        { trigger_event: 'application_approved', template_id: 3, channel: 'email', conditions_json: '{}' },
        { trigger_event: 'contact_submitted', template_id: 4, channel: 'email', conditions_json: '{}' },
        { trigger_event: 'subscriber_joined', template_id: 1, channel: 'email', conditions_json: '{}' }
      ];
      for (const a of automations) {
        await pool.query('INSERT INTO automations (trigger_event, template_id, channel, is_enabled, conditions_json) VALUES ($1, $2, $3, true, $4)',
          [a.trigger_event, a.template_id, a.channel, a.conditions_json]);
      }
      console.log('Seeded 4 automations');
    }
  };

  await seedAdminUser();
  await seedSettings();
  await seedPrograms();
  await seedPlans();
  await seedCoaches();
  await seedNav();
  await seedTemplates();
  await seedAutomations();

  console.log('\nSeed complete. Admin: admin@thearchive.ch / archive2024');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
