const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/programs', async (req, res) => {
    const items = await pool.query('SELECT * FROM programs ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  });

  app.get('/api/programs/:id', async (req, res) => {
    const item = await pool.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/programs', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(`
      INSERT INTO programs (slug, title, description, full_description, difficulty, duration, frequency,
        image, benefits, cta_text, cta_destination, visibility, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id
    `, [b.slug, b.title, b.description, b.full_description, b.difficulty, b.duration, b.frequency,
      b.image, b.benefits, b.cta_text, b.cta_destination, b.visibility ? true : false, b.sort_order || 0]);
    await auditLog(null, req.admin.id, 'create', 'programs', result.rows[0].id, { title: b.title });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/programs/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM programs WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      slug: b.slug !== undefined ? b.slug : existing.slug,
      title: b.title !== undefined ? b.title : existing.title,
      description: b.description !== undefined ? b.description : existing.description,
      full_description: b.full_description !== undefined ? b.full_description : existing.full_description,
      difficulty: b.difficulty !== undefined ? b.difficulty : existing.difficulty,
      duration: b.duration !== undefined ? b.duration : existing.duration,
      frequency: b.frequency !== undefined ? b.frequency : existing.frequency,
      image: b.image !== undefined ? b.image : existing.image,
      benefits: b.benefits !== undefined ? b.benefits : existing.benefits,
      cta_text: b.cta_text !== undefined ? b.cta_text : existing.cta_text,
      cta_destination: b.cta_destination !== undefined ? b.cta_destination : existing.cta_destination,
      visibility: b.visibility !== undefined ? (b.visibility ? true : false) : existing.visibility,
      sort_order: b.sort_order !== undefined ? b.sort_order : existing.sort_order
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE programs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'programs', parseInt(req.params.id), { title: updateObj.title });
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/programs/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM programs WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'programs', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
