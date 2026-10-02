const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/contacts', authRequired(), async (req, res) => {
    const { status, search, sort = 'created_at', order = 'desc' } = req.query;
    let where = [];
    let params = [];

    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      where.push(`(first_name LIKE $${params.length - 3} OR last_name LIKE $${params.length - 2} OR email LIKE $${params.length - 1} OR message LIKE $${params.length})`);
    }

    let query = 'SELECT * FROM contact_submissions';
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ` ORDER BY ${sort} ${order}`;

    const items = await pool.query(query, params);
    res.json(items.rows);
  });

  app.post('/api/contacts', async (req, res) => {
    const b = req.body;
    const result = await pool.query(`
      INSERT INTO contact_submissions (first_name, last_name, email, phone, inquiry_type, message, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'new') RETURNING id
    `, [b.first_name, b.last_name, b.email, b.phone, b.inquiry_type, b.message]);
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/contacts/:id/status', authRequired(), async (req, res) => {
    const { status } = req.body;
    const valid = ['new', 'read', 'responded', 'archived'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await pool.query('UPDATE contact_submissions SET status = $1 WHERE id = $2', [status, req.params.id]);
    await auditLog(null, req.admin.id, 'update_contact_status', 'contact_submissions', parseInt(req.params.id), { status });
    res.json({ success: true });
  });

  app.delete('/api/contacts/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM contact_submissions WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'contact_submissions', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
