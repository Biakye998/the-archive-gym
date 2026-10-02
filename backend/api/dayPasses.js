const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/day-pass-requests', authRequired(), async (req, res) => {
    const { status, search, sort = 'created_at', order = 'desc', limit } = req.query;
    let where = [];
    let params = [];

    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      where.push(`(first_name LIKE $${params.length - 2} OR last_name LIKE $${params.length - 1} OR email LIKE $${params.length})`);
    }

    let query = 'SELECT * FROM day_pass_requests';
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ` ORDER BY ${sort} ${order}`;
    if (limit) query += ` LIMIT ${parseInt(limit)}`;

    const items = await pool.query(query, params);
    res.json(items.rows);
  });

  app.get('/api/day-pass-requests/:id', authRequired(), async (req, res) => {
    const item = await pool.query('SELECT * FROM day_pass_requests WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/day-pass-requests', async (req, res) => {
    const b = req.body;
    if (!b.first_name || !b.last_name || !b.email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    const result = await pool.query(`
      INSERT INTO day_pass_requests (first_name, last_name, email, phone, visit_date, visit_time, guests, source, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'website', 'new') RETURNING id
    `, [b.first_name, b.last_name, b.email, b.phone, b.visit_date, b.visit_time, b.guests || 0]);

    await auditLog(null, null, 'day_pass_requested', 'day_pass_requests', result.rows[0].id, { email: b.email });

    res.status(201).json({ id: result.rows[0].id, reference: 'DP-' + String(result.rows[0].id).padStart(4, '0') });
  });

  app.put('/api/day-pass-requests/:id/status', authRequired(), async (req, res) => {
    const { status, notes } = req.body;
    const valid = ['new', 'confirmed', 'cancelled', 'completed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await pool.query('UPDATE day_pass_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, req.params.id]);
    if (notes) await pool.query('UPDATE day_pass_requests SET internal_notes = $1 WHERE id = $2', [notes, req.params.id]);
    await auditLog(null, req.admin.id, 'update_day_pass_status', 'day_pass_requests', parseInt(req.params.id), { status });
    res.json({ success: true });
  });

  app.delete('/api/day-pass-requests/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM day_pass_requests WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'day_pass_requests', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
