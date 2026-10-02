const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/admin-users', authRequired(['owner']), async (req, res) => {
    const items = await pool.query('SELECT id, email, role, created_at, last_login FROM admin_users ORDER BY created_at DESC');
    res.json(items.rows);
  });

  app.post('/api/admin-users', authRequired(['owner']), async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync(password, 10);

    const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (existing.rows[0]) return res.status(409).json({ error: 'User already exists' });

    const result = await pool.query(
      'INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [email, passwordHash, role || 'admin']
    );
    await auditLog(null, req.admin.id, 'create_user', 'admin_users', result.rows[0].id, { email, role: role || 'admin' });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.delete('/api/admin-users/:id', authRequired(['owner']), async (req, res) => {
    await pool.query('DELETE FROM admin_users WHERE id = $1 AND role != $2', [req.params.id, 'owner']);
    await auditLog(null, req.admin.id, 'delete_user', 'admin_users', parseInt(req.params.id));
    res.json({ success: true });
  });

  app.get('/api/audit-log', authRequired(), async (req, res) => {
    const items = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200');
    res.json(items.rows);
  });
}

module.exports = registerRoutes;
