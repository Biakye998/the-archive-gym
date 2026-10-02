const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/testimonials', async (req, res) => {
    const items = await pool.query('SELECT * FROM testimonials WHERE visibility = true ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  });

  app.get('/api/testimonials/all', authRequired(), async (req, res) => {
    const items = await pool.query('SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  });

  app.get('/api/testimonials/:id', authRequired(), async (req, res) => {
    const item = await pool.query('SELECT * FROM testimonials WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/testimonials', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(
      'INSERT INTO testimonials (name, quote, image, rating, visibility, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [b.name, b.quote, b.image, b.rating, b.visibility ? true : false, b.sort_order || 0]
    );
    await auditLog(null, req.admin.id, 'create', 'testimonials', result.rows[0].id, { name: b.name });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/testimonials/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM testimonials WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      name: b.name !== undefined ? b.name : existing.name,
      quote: b.quote !== undefined ? b.quote : existing.quote,
      image: b.image !== undefined ? b.image : existing.image,
      rating: b.rating !== undefined ? b.rating : existing.rating,
      visibility: b.visibility !== undefined ? (b.visibility ? true : false) : existing.visibility,
      sort_order: b.sort_order !== undefined ? b.sort_order : existing.sort_order
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE testimonials SET ${fields} WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'testimonials', parseInt(req.params.id), { name: updateObj.name });
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/testimonials/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM testimonials WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'testimonials', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
