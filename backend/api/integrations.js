const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/integration-configs', authRequired(), async (req, res) => {
    const items = await pool.query('SELECT * FROM integration_configs ORDER BY integration_type, provider ASC');
    res.json(items.rows);
  });

  app.get('/api/integration-configs/:id', authRequired(), async (req, res) => {
    const item = await pool.query('SELECT * FROM integration_configs WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/integration-configs', authRequired(), async (req, res) => {
    const b = req.body;
    const configStr = b.config_json !== undefined ? b.config_json : JSON.stringify(b.config || {});
    const result = await pool.query(
      'INSERT INTO integration_configs (provider, integration_type, config_json, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [b.provider, b.integration_type, configStr, b.status || 'configured']
    );
    await auditLog(null, req.admin.id, 'create', 'integration_configs', result.rows[0].id, { provider: b.provider });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/integration-configs/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM integration_configs WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      provider: b.provider !== undefined ? b.provider : existing.provider,
      integration_type: b.integration_type !== undefined ? b.integration_type : existing.integration_type,
      config_json: b.config_json !== undefined ? b.config_json : (b.config !== undefined ? JSON.stringify(b.config) : existing.config_json),
      status: b.status !== undefined ? b.status : existing.status
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE integration_configs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'integration_configs', parseInt(req.params.id));
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/integration-configs/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM integration_configs WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'integration_configs', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
