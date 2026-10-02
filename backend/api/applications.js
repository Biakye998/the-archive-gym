const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/applications', authRequired(), async (req, res) => {
    const { status, search, sort = 'created_at', order = 'desc' } = req.query;
    let where = [];
    let params = [];

    if (status) {
      params.push(status);
      where.push(`a.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      where.push(`(a.first_name LIKE $${params.length - 2} OR a.last_name LIKE $${params.length - 1} OR a.email LIKE $${params.length})`);
    }

    let query = 'SELECT a.*, p.title as plan_title, pr.title as program_title FROM applications a';
    query += ' LEFT JOIN plans p ON a.plan_id = p.id LEFT JOIN programs pr ON a.program_id = pr.id';
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ` ORDER BY a.${sort} ${order}`;

    const items = await pool.query(query, params);
    res.json(items.rows);
  });

  app.get('/api/applications/:id', authRequired(), async (req, res) => {
    const item = await pool.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/applications', async (req, res) => {
    const b = req.body;
    const planId = b.plan_slug ? (await pool.query('SELECT id FROM plans WHERE slug = $1', [b.plan_slug])).rows[0]?.id : (b.plan_id || null);
    const programId = b.program_slug ? (await pool.query('SELECT id FROM programs WHERE slug = $1', [b.program_slug])).rows[0]?.id : (b.program_id || null);

    const result = await pool.query(`
      INSERT INTO applications (first_name, last_name, email, phone, age, plan_id, program_id, goals, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new') RETURNING id
    `, [b.first_name, b.last_name, b.email, b.phone, b.age, planId, programId, b.goals]);

    if (planId) {
      const plan = (await pool.query('SELECT title FROM plans WHERE id = $1', [planId])).rows[0];
      if (plan) {
        await auditLog(null, null, 'application_submitted', 'applications', result.rows[0].id, { plan: plan.title });
      }
    }
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/applications/:id/status', authRequired(), async (req, res) => {
    const { status, notes } = req.body;
    const valid = ['new', 'reviewing', 'contacted', 'approved', 'rejected', 'completed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await pool.query('UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, req.params.id]);
    if (notes) await pool.query('UPDATE applications SET internal_notes = $1 WHERE id = $2', [notes, req.params.id]);
    await auditLog(null, req.admin.id, 'update_application_status', 'applications', parseInt(req.params.id), { status });
    res.json({ success: true });
  });

  app.delete('/api/applications/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM applications WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'applications', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
