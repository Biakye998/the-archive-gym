const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

async function getImageDimensions(filePath) {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(filePath).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch (e) {
    return { width: 0, height: 0 };
  }
}

module.exports = { upload, getImageDimensions, uploadDir };
