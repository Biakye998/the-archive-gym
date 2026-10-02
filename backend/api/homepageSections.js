const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/homepage-sections', async (req, res) => {
    const items = await pool.query('SELECT * FROM homepage_sections ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  });

  app.get('/api/homepage-sections/:key', async (req, res) => {
    const item = await pool.query('SELECT * FROM homepage_sections WHERE section_key = $1', [req.params.key]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/homepage-sections', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(
      'INSERT INTO homepage_sections (section_key, title, subtitle, description, content_json, visibility, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [b.section_key, b.title, b.subtitle, b.description, b.content_json, b.visibility ? true : false, b.sort_order || 0]
    );
    await auditLog(null, req.admin.id, 'create', 'homepage_sections', result.rows[0].id);
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/homepage-sections/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM homepage_sections WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      section_key: b.section_key !== undefined ? b.section_key : existing.section_key,
      title: b.title !== undefined ? b.title : existing.title,
      subtitle: b.subtitle !== undefined ? b.subtitle : existing.subtitle,
      description: b.description !== undefined ? b.description : existing.description,
      content_json: b.content_json !== undefined ? b.content_json : existing.content_json,
      visibility: b.visibility !== undefined ? (b.visibility ? true : false) : existing.visibility,
      sort_order: b.sort_order !== undefined ? b.sort_order : existing.sort_order
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE homepage_sections SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'homepage_sections', parseInt(req.params.id));
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/homepage-sections/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM homepage_sections WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'homepage_sections', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
