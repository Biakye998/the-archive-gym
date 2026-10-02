const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/coaches', async (req, res) => {
    const items = await pool.query('SELECT * FROM coaches ORDER BY sort_order ASC, id ASC');
    res.json(items.rows);
  });

  app.get('/api/coaches/:id', async (req, res) => {
    const item = await pool.query('SELECT * FROM coaches WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/coaches', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(`
      INSERT INTO coaches (slug, name, title, bio, credentials, image, specialties,
        social_links, visibility, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
    `, [b.slug, b.name, b.title, b.bio, b.credentials, b.image, b.specialties,
      b.social_links, b.visibility ? true : false, b.sort_order || 0]);
    await auditLog(null, req.admin.id, 'create', 'coaches', result.rows[0].id, { name: b.name });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/coaches/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM coaches WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      slug: b.slug !== undefined ? b.slug : existing.slug,
      name: b.name !== undefined ? b.name : existing.name,
      title: b.title !== undefined ? b.title : existing.title,
      bio: b.bio !== undefined ? b.bio : existing.bio,
      credentials: b.credentials !== undefined ? b.credentials : existing.credentials,
      image: b.image !== undefined ? b.image : existing.image,
      specialties: b.specialties !== undefined ? b.specialties : existing.specialties,
      social_links: b.social_links !== undefined ? b.social_links : existing.social_links,
      visibility: b.visibility !== undefined ? (b.visibility ? true : false) : existing.visibility,
      sort_order: b.sort_order !== undefined ? b.sort_order : existing.sort_order
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE coaches SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'coaches', parseInt(req.params.id), { name: updateObj.name });
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/coaches/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM coaches WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'coaches', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
