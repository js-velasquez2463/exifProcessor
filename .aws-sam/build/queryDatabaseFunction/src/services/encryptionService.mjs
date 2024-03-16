import { randomBytes, createCipheriv } from 'crypto';

export const encryptText = (text, encryptionKey)  => {
    const iv = randomBytes(16); // Genera un vector de inicialización
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}