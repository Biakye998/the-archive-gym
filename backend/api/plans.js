const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/plans', async (req, res) => {
    const items = await pool.query('SELECT * FROM plans ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  });

  app.get('/api/plans/:id', async (req, res) => {
    const item = await pool.query('SELECT * FROM plans WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/plans', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(`
      INSERT INTO plans (slug, title, description, price, currency_code, currency_symbol,
        billing_period, badge_text, is_featured, benefits, cta_text, cta_destination,
        visibility, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id
    `, [b.slug, b.title, b.description, b.price, b.currency_code, b.currency_symbol,
      b.billing_period, b.badge_text, b.is_featured ? true : false, b.benefits, b.cta_text, b.cta_destination,
      b.visibility ? true : false, b.sort_order || 0]);
    await auditLog(null, req.admin.id, 'create', 'plans', result.rows[0].id, { title: b.title });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/plans/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM plans WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      slug: b.slug !== undefined ? b.slug : existing.slug,
      title: b.title !== undefined ? b.title : existing.title,
      description: b.description !== undefined ? b.description : existing.description,
      price: b.price !== undefined ? b.price : existing.price,
      currency_code: b.currency_code !== undefined ? b.currency_code : existing.currency_code,
      currency_symbol: b.currency_symbol !== undefined ? b.currency_symbol : existing.currency_symbol,
      billing_period: b.billing_period !== undefined ? b.billing_period : existing.billing_period,
      badge_text: b.badge_text !== undefined ? b.badge_text : existing.badge_text,
      is_featured: b.is_featured !== undefined ? (b.is_featured ? true : false) : existing.is_featured,
      benefits: b.benefits !== undefined ? b.benefits : existing.benefits,
      cta_text: b.cta_text !== undefined ? b.cta_text : existing.cta_text,
      cta_destination: b.cta_destination !== undefined ? b.cta_destination : existing.cta_destination,
      visibility: b.visibility !== undefined ? (b.visibility ? true : false) : existing.visibility,
      sort_order: b.sort_order !== undefined ? b.sort_order : existing.sort_order
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE plans SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'plans', parseInt(req.params.id), { title: updateObj.title });
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/plans/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM plans WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'plans', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
