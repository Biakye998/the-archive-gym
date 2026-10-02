const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/pages', async (req, res) => {
    const items = await pool.query('SELECT * FROM pages ORDER BY created_at DESC');
    res.json(items.rows);
  });

  app.get('/api/pages/:id', async (req, res) => {
    const item = await pool.query('SELECT * FROM pages WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/pages', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(
      'INSERT INTO pages (slug, title, meta_title, meta_description, status, template, content_sections) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [b.slug, b.title, b.meta_title, b.meta_description, b.status || 'draft', b.template || 'default', b.content_sections]
    );
    await auditLog(null, req.admin.id, 'create', 'pages', result.rows[0].id, { title: b.title });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/pages/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM pages WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      slug: b.slug !== undefined ? b.slug : existing.slug,
      title: b.title !== undefined ? b.title : existing.title,
      meta_title: b.meta_title !== undefined ? b.meta_title : existing.meta_title,
      meta_description: b.meta_description !== undefined ? b.meta_description : existing.meta_description,
      status: b.status !== undefined ? b.status : existing.status,
      template: b.template !== undefined ? b.template : existing.template,
      content_sections: b.content_sections !== undefined ? b.content_sections : existing.content_sections
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE pages SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'pages', parseInt(req.params.id), { title: updateObj.title });
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/pages/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM pages WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'pages', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
