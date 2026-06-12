import CryptoJS from 'crypto-js';

// 生产环境加解密所用的密钥 (防止反编译混淆，优先从环境变量读取，默认为 xb-secure-salt)
const SECRET_KEY = process.env.NEXT_PUBLIC_CRYPTO_KEY || 'xb-local-secret-salt-2026';

/**
 * AES-256 对称加密
 */
export function encryptData(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
  } catch (error) {
    console.error('LocalStorage 写入加密失败:', error);
    return '';
  }
}

/**
 * AES-256 对称解密
 */
export function decryptData(ciphertext: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Decrypted content is empty');
    }
    return decrypted;
  } catch (error) {
    // 解密失败通常意味着数据在外界被手动修改/篡改，或者密钥不匹配
    throw new Error('Data decryption failed. The state may have been tampered with.');
  }
}
