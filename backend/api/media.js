const path = require('path');
const fs = require('fs');
const { pool, auditLog } = require('../database');
const { authRequired } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');

function registerRoutes(app) {

  app.get('/api/media', authRequired(), async (req, res) => {
    const items = await pool.query('SELECT * FROM media ORDER BY created_at DESC LIMIT 100');
    res.json(items.rows);
  });

  app.post('/api/media/upload', authRequired(), (req, res) => {
    const upload = require('../middleware/upload');
    upload.single('file')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const width = req.file.width || 0;
      const height = req.file.height || 0;

      const result = await pool.query(
        'INSERT INTO media (filename, original_name, path, size, mime_type, alt_text, width, height) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [req.file.filename, req.file.originalname, `/${req.file.filename}`, req.file.size, req.file.mimetype, req.body.alt_text || '', width, height]
      );

      await auditLog(null, req.admin.id, 'upload_media', 'media', result.rows[0].id, { filename: req.file.filename });
      res.status(201).json({ id: result.rows[0].id, filename: req.file.filename, path: `/${req.file.filename}` });
    });
  });

  app.put('/api/media/:id', authRequired(), async (req, res) => {
    const b = req.body;
    await pool.query('UPDATE media SET alt_text = $1 WHERE id = $2', [b.alt_text, req.params.id]);
    await auditLog(null, req.admin.id, 'update_media', 'media', parseInt(req.params.id));
    res.json({ success: true });
  });

  app.delete('/api/media/:id', authRequired(), async (req, res) => {
    const media = (await pool.query('SELECT path FROM media WHERE id = $1', [req.params.id])).rows[0];
    if (media && media.path) {
      const filePath = path.join(__dirname, '..', 'uploads', path.basename(media.path));
      try { fs.unlinkSync(filePath); } catch (e) { }
    }
    await pool.query('DELETE FROM media WHERE id = $1', [req.params.id]);
    await auditLog(null, req.admin.id, 'delete_media', 'media', parseInt(req.params.id));
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
