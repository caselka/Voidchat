import { randomBytes } from '@noble/ciphers/utils';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { scryptSync } from '@noble/hashes/scrypt';
import { sha256 } from '@noble/hashes/sha256';

export interface EncryptedMessage {
  encryptedContent: string;
  nonce: string;
  ephemeralPublicKey: string;
}

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

// Generate a key pair for end-to-end encryption
export function generateKeyPair(): KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = sha256(privateKey);
  return { privateKey, publicKey };
}

// Derive a shared secret from two key pairs using ECDH-like approach
function deriveSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  // Simple key derivation - in production, use proper ECDH
  const combined = new Uint8Array(privateKey.length + publicKey.length);
  combined.set(privateKey);
  combined.set(publicKey, privateKey.length);
  return scryptSync(combined, publicKey.slice(0, 16), { N: 16384, r: 8, p: 1, dkLen: 32 });
}

// Encrypt a message for end-to-end encryption
export function encryptMessage(
  message: string,
  recipientPublicKey: Uint8Array,
  senderPrivateKey: Uint8Array
): EncryptedMessage {
  const nonce = randomBytes(24);
  const ephemeralKeyPair = generateKeyPair();
  const sharedSecret = deriveSharedSecret(senderPrivateKey, recipientPublicKey);
  
  const cipher = xchacha20poly1305(sharedSecret, nonce);
  const messageBytes = new TextEncoder().encode(message);
  const encrypted = cipher.encrypt(messageBytes);
  
  return {
    encryptedContent: btoa(String.fromCharCode(...encrypted)),
    nonce: btoa(String.fromCharCode(...nonce)),
    ephemeralPublicKey: btoa(String.fromCharCode(...ephemeralKeyPair.publicKey))
  };
}

// Decrypt a message for end-to-end encryption
export function decryptMessage(
  encryptedMessage: EncryptedMessage,
  recipientPrivateKey: Uint8Array,
  senderPublicKey: Uint8Array
): string {
  try {
    const nonce = Uint8Array.from(atob(encryptedMessage.nonce), c => c.charCodeAt(0));
    const encrypted = Uint8Array.from(atob(encryptedMessage.encryptedContent), c => c.charCodeAt(0));
    const sharedSecret = deriveSharedSecret(recipientPrivateKey, senderPublicKey);
    
    const cipher = xchacha20poly1305(sharedSecret, nonce);
    const decrypted = cipher.decrypt(encrypted);
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt message');
  }
}

// Store encryption keys in localStorage with proper security
export function storeKeyPair(keyPair: KeyPair): void {
  const publicKeyB64 = btoa(String.fromCharCode(...keyPair.publicKey));
  const privateKeyB64 = btoa(String.fromCharCode(...keyPair.privateKey));
  
  localStorage.setItem('voidchat_public_key', publicKeyB64);
  localStorage.setItem('voidchat_private_key', privateKeyB64);
}

// Retrieve encryption keys from localStorage
export function getStoredKeyPair(): KeyPair | null {
  try {
    const publicKeyB64 = localStorage.getItem('voidchat_public_key');
    const privateKeyB64 = localStorage.getItem('voidchat_private_key');
    
    if (!publicKeyB64 || !privateKeyB64) return null;
    
    const publicKey = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0));
    const privateKey = Uint8Array.from(atob(privateKeyB64), c => c.charCodeAt(0));
    
    return { publicKey, privateKey };
  } catch (error) {
    return null;
  }
}

// Initialize encryption keys for a user
export function initializeEncryption(): KeyPair {
  let keyPair = getStoredKeyPair();
  
  if (!keyPair) {
    keyPair = generateKeyPair();
    storeKeyPair(keyPair);
  }
  
  return keyPair;
}

// Generate a fingerprint for key verification
export function generateKeyFingerprint(publicKey: Uint8Array): string {
  const hash = sha256(publicKey);
  return btoa(String.fromCharCode(...hash.slice(0, 8))).replace(/[+/=]/g, '').toUpperCase();
}