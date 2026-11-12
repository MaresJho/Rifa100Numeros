const crypto = require('crypto');

// Clave desde variable de entorno o fallback seguro
const SECRET = process.env.ENCRYPTION_KEY || '241817A5821A222C401BC45F7D501222738E219152E5CA4B6E';

// Derivar una clave de 32 bytes (256 bits) usando SHA-256
function getKey() {
  return crypto.createHash('sha256').update(String(SECRET)).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Formato: iv:contenido_cifrado
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Error al desencriptar:', err.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
