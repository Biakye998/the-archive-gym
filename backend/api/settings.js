const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/settings', async (req, res) => {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO settings (id, business_name) VALUES (1, $1)', ['THE ARCHIVE']);
      const r2 = await pool.query('SELECT * FROM settings WHERE id = 1');
      return res.json(r2.rows[0]);
    }
    res.json(result.rows[0]);
  });

  app.put('/api/settings', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM settings WHERE id = 1')).rows[0];

    const updateObj = {
      business_name: b.business_name !== undefined ? b.business_name : existing.business_name,
      business_tagline: b.business_tagline !== undefined ? b.business_tagline : existing.business_tagline,
      logo: b.logo !== undefined ? b.logo : existing.logo,
      favicon: b.favicon !== undefined ? b.favicon : existing.favicon,
      site_title: b.site_title !== undefined ? b.site_title : existing.site_title,
      site_description: b.site_description !== undefined ? b.site_description : existing.site_description,
      contact_email: b.contact_email !== undefined ? b.contact_email : existing.contact_email,
      contact_phone: b.contact_phone !== undefined ? b.contact_phone : existing.contact_phone,
      address: b.address !== undefined ? b.address : existing.address,
      business_hours: b.business_hours !== undefined ? b.business_hours : existing.business_hours,
      timezone: b.timezone !== undefined ? b.timezone : existing.timezone,
      currency_code: b.currency_code !== undefined ? b.currency_code : existing.currency_code,
      currency_symbol: b.currency_symbol !== undefined ? b.currency_symbol : existing.currency_symbol,
      language: b.language !== undefined ? b.language : existing.language,
      website_url: b.website_url !== undefined ? b.website_url : existing.website_url,
      copyright_text: b.copyright_text !== undefined ? b.copyright_text : existing.copyright_text,
      social_links: b.social_links !== undefined ? b.social_links : existing.social_links,
      seo_global_title: b.seo_global_title !== undefined ? b.seo_global_title : existing.seo_global_title,
      seo_global_description: b.seo_global_description !== undefined ? b.seo_global_description : existing.seo_global_description,
      seo_og_image: b.seo_og_image !== undefined ? b.seo_og_image : existing.seo_og_image,
      cookie_consent_enabled: b.cookie_consent_enabled !== undefined ? (b.cookie_consent_enabled ? true : false) : existing.cookie_consent_enabled,
      cookie_consent_text: b.cookie_consent_text !== undefined ? b.cookie_consent_text : existing.cookie_consent_text
    };

    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(updateObj);
    await pool.query(`UPDATE settings SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`, values);
    await auditLog(null, req.admin.id, 'update_settings');
    res.json({ success: true, ...updateObj });
  });

  app.put('/api/settings/social', authRequired(), async (req, res) => {
    const { social_links } = req.body;
    const sl = typeof social_links === 'string' ? social_links : JSON.stringify(social_links);
    await pool.query('UPDATE settings SET social_links = $1 WHERE id = 1', [sl]);
    await auditLog(null, req.admin.id, 'update_social_links');
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
