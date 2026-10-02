const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/nav-items', async (req, res) => {
    const items = await pool.query("SELECT * FROM nav_items WHERE visibility = true ORDER BY position, sort_order ASC");
    res.json(items.rows);
  });

  app.get('/api/nav-items/all', authRequired(), async (req, res) => {
    const items = await pool.query('SELECT * FROM nav_items ORDER BY position, sort_order ASC');
    res.json(items.rows);
  });

  app.post('/api/nav-items', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(
      'INSERT INTO nav_items (label, url, position, section_name, sort_order, visibility) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [b.label, b.url, b.position || 'main', b.section_name || null, b.sort_order || 0, b.visibility ? true : false]
    );
    await auditLog(null, req.admin.id, 'create', 'nav_items', result.rows[0].id, { label: b.label });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/nav-items/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM nav_items WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      label: b.label !== undefined ? b.label : existing.label,
      url: b.url !== undefined ? b.url : existing.url,
      position: b.position !== undefined ? b.position : existing.position,
      section_name: b.section_name !== undefined ? b.section_name : existing.section_name,
      sort_order: b.sort_order !== undefined ? b.sort_order : existing.sort_order,
      visibility: b.visibility !== undefined ? (b.visibility ? true : false) : existing.visibility
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE nav_items SET ${fields} WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'nav_items', parseInt(req.params.id));
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/nav-items/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM nav_items WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'nav_items', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
