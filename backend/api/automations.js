const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

function registerRoutes(app) {

  app.get('/api/automations', authRequired(), async (req, res) => {
    const items = await pool.query('SELECT * FROM automations ORDER BY created_at DESC');
    res.json(items.rows);
  });

  app.get('/api/automations/:id', authRequired(), async (req, res) => {
    const item = await pool.query('SELECT * FROM automations WHERE id = $1', [req.params.id]);
    if (!item.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(item.rows[0]);
  });

  app.post('/api/automations', authRequired(), async (req, res) => {
    const b = req.body;
    const result = await pool.query(
      'INSERT INTO automations (trigger_event, template_id, channel, is_enabled, conditions_json) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [b.trigger_event, b.template_id, b.channel, b.is_enabled ? true : false, JSON.stringify(b.conditions || {})]
    );
    await auditLog(null, req.admin.id, 'create', 'automations', result.rows[0].id, { trigger: b.trigger_event });
    res.status(201).json({ id: result.rows[0].id });
  });

  app.put('/api/automations/:id', authRequired(), async (req, res) => {
    const b = req.body;
    const existing = (await pool.query('SELECT * FROM automations WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updateObj = {
      trigger_event: b.trigger_event !== undefined ? b.trigger_event : existing.trigger_event,
      template_id: b.template_id !== undefined ? b.template_id : existing.template_id,
      channel: b.channel !== undefined ? b.channel : existing.channel,
      is_enabled: b.is_enabled !== undefined ? (b.is_enabled ? true : false) : existing.is_enabled,
      conditions_json: b.conditions !== undefined ? JSON.stringify(b.conditions) : existing.conditions_json
    };
    const fields = Object.keys(updateObj).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObj), req.params.id];
    await pool.query(`UPDATE automations SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    await auditLog(null, req.admin.id, 'update', 'automations', parseInt(req.params.id));
    res.json({ success: true, id: req.params.id, ...updateObj });
  });

  app.delete('/api/automations/:id', authRequired(), async (req, res) => {
    await pool.query('DELETE FROM automations WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete', 'automations', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
