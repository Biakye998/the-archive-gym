const { pool, auditLog, generateToken } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const bcrypt = require('bcryptjs');

    const userResult = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.query('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    await auditLog(null, user.id, 'login');

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  app.post('/api/auth/register', authRequired(['owner']), async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync(password, 10);

    const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'User already exists' });

    const result = await pool.query(
      'INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [email, passwordHash, role || 'admin']
    );
    await auditLog(null, req.admin.id, 'create_user', 'admin_users', result.rows[0].id, { email, role: role || 'admin' });
    res.status(201).json({ user: { id: result.rows[0].id, email, role: role || 'admin' } });
  });

  app.get('/api/auth/me', authRequired(), async (req, res) => {
    const user = await pool.query('SELECT id, email, role, last_login FROM admin_users WHERE id = $1', [req.admin.id]);
    res.json({ user: user.rows[0] });
  });
}

module.exports = registerRoutes;
