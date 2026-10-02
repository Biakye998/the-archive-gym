const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/templates', authRequired(), async (req, res) => {
    const items = await pool.query('SELECT * FROM templates ORDER BY category ASC, name ASC');
    res.json(items.rows);
  });

  app.get('/api/templates/:id', authRequired(), async (req, res) => {
    const item = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/templates', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(
      'INSERT INTO templates (template_key, name, category, subject, html_content, text_content, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [b.template_key, b.name, b.category, b.subject, b.html_content, b.text_content, b.is_active ? true : false]
    );
    await auditLog(null, req.admin.id, 'create', 'templates', result.rows[0].id, { name: b.name });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/templates/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      template_key: b.template_key !== undefined ? b.template_key : existing.template_key,
      name: b.name !== undefined ? b.name : existing.name,
      category: b.category !== undefined ? b.category : existing.category,
      subject: b.subject !== undefined ? b.subject : existing.subject,
      html_content: b.html_content !== undefined ? b.html_content : existing.html_content,
      text_content: b.text_content !== undefined ? b.text_content : existing.text_content,
      is_active: b.is_active !== undefined ? (b.is_active ? true : false) : existing.is_active
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE templates SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'templates', parseInt(req.params.id), { name: updateObj.name });
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/templates/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'templates', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
