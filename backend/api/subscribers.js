const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/subscribers', authRequired(), async (req, res) => {
    const { status, consent, search, limit = 100, offset = 0 } = req.query;
    let where = [];
    let params = [];

    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (consent) {
      params.push(consent);
      where.push(`consent_status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      where.push(`(email LIKE $${params.length - 2} OR first_name LIKE $${params.length - 1} OR last_name LIKE $${params.length})`);
    }

    let query = 'SELECT * FROM subscribers';
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ` ORDER BY signup_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const items = await pool.query(query, params);
    const totalParams = params.slice(0, -2);
    const countQuery = `SELECT COUNT(*) FROM subscribers${where.length ? ' WHERE ' + where.join(' AND ') : ''}`;
    const total = (await pool.query(countQuery, totalParams)).rows[0].count;

    res.json({ items: items.rows, total: parseInt(total) });
  });

  app.post('/api/subscribers', async (req, res) => {
    const b = req.body;
    const existing = await pool.query('SELECT id FROM subscribers WHERE email = $1', [b.email]);
    if (existing.rows[0]) {
      await pool.query(
        'UPDATE subscribers SET status = $1, consent_status = $2, consent_date = CASE WHEN consent_status = $2 THEN consent_date ELSE CURRENT_TIMESTAMP END, first_name = COALESCE($3, first_name), last_name = COALESCE($4, last_name) WHERE email = $5',
        ['active', b.consent_status || 'granted', b.first_name, b.last_name, b.email]
      );
      return res.status(200).json({ id: existing.rows[0].id, existing: true });
    }

    const result = await pool.query(`
      INSERT INTO subscribers (email, first_name, last_name, consent_status, consent_date)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id
    `, [b.email, b.first_name, b.last_name, b.consent_status || 'granted']);
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/subscribers/:id/unsubscribe', authRequired(), async (req, res) => {
    await pool.query('UPDATE subscribers SET status = $1, unsubscribe_date = CURRENT_TIMESTAMP WHERE id = $2', ['unsubscribed', req.params.id]);
    await auditLog(null, req.admin.id, 'unsubscribe', 'subscribers', parseInt(req.params.id));
    res.json({ success: true });
  });

  app.delete('/api/subscribers/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM subscribers WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'subscribers', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
