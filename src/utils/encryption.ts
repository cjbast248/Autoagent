/**
 * Encryption utilities for sensitive data like SIP credentials
 * Uses AES-256-GCM for symmetric encryption
 */

// Get encryption key from environment or generate a default for development
const getEncryptionKey = async (): Promise<CryptoKey> => {
  // In production, this should come from environment variables
  // For now, we use a derived key from a passphrase
  const passphrase = import.meta.env.VITE_ENCRYPTION_KEY || 'agentauto-default-encryption-key-change-in-production';

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Use a fixed salt for consistency (in production, store salt per-record)
  const salt = encoder.encode('agentauto-sip-salt-v1');

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypts a string using AES-256-GCM
 * Returns base64 encoded string with IV prepended
 */
export const encryptString = async (plaintext: string): Promise<string> => {
  if (!plaintext) return '';

  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts a base64 encoded string that was encrypted with encryptString
 */
export const decryptString = async (ciphertext: string): Promise<string> => {
  if (!ciphertext) return '';

  try {
    const key = await getEncryptionKey();

    // Decode base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // Return empty string if decryption fails (might be unencrypted data)
    return ciphertext;
  }
};

/**
 * Encrypts SIP credentials object
 */
export const encryptSipCredentials = async (credentials: {
  username?: string;
  password?: string;
}): Promise<{
  username?: string;
  password?: string;
  encrypted?: boolean;
}> => {
  if (!credentials.username && !credentials.password) {
    return credentials;
  }

  return {
    username: credentials.username ? await encryptString(credentials.username) : undefined,
    password: credentials.password ? await encryptString(credentials.password) : undefined,
    encrypted: true
  };
};

/**
 * Decrypts SIP credentials object
 */
export const decryptSipCredentials = async (credentials: {
  username?: string;
  password?: string;
  encrypted?: boolean;
}): Promise<{
  username?: string;
  password?: string;
}> => {
  // If not marked as encrypted, return as-is
  if (!credentials.encrypted) {
    return {
      username: credentials.username,
      password: credentials.password
    };
  }

  return {
    username: credentials.username ? await decryptString(credentials.username) : undefined,
    password: credentials.password ? await decryptString(credentials.password) : undefined
  };
};

/**
 * Encrypts entire SIP config object (both inbound and outbound credentials)
 */
export const encryptSipConfig = async (sipConfig: any): Promise<any> => {
  if (!sipConfig) return sipConfig;

  const result = { ...sipConfig };

  // Encrypt inbound credentials
  if (result.inbound_trunk_config?.credentials) {
    result.inbound_trunk_config = {
      ...result.inbound_trunk_config,
      credentials: await encryptSipCredentials(result.inbound_trunk_config.credentials)
    };
  }

  // Encrypt outbound credentials
  if (result.outbound_trunk_config?.credentials) {
    result.outbound_trunk_config = {
      ...result.outbound_trunk_config,
      credentials: await encryptSipCredentials(result.outbound_trunk_config.credentials)
    };
  }

  return result;
};

/**
 * Decrypts entire SIP config object (both inbound and outbound credentials)
 */
export const decryptSipConfig = async (sipConfig: any): Promise<any> => {
  if (!sipConfig) return sipConfig;

  const result = { ...sipConfig };

  // Decrypt inbound credentials
  if (result.inbound_trunk_config?.credentials) {
    result.inbound_trunk_config = {
      ...result.inbound_trunk_config,
      credentials: await decryptSipCredentials(result.inbound_trunk_config.credentials)
    };
  }

  // Decrypt outbound credentials
  if (result.outbound_trunk_config?.credentials) {
    result.outbound_trunk_config = {
      ...result.outbound_trunk_config,
      credentials: await decryptSipCredentials(result.outbound_trunk_config.credentials)
    };
  }

  return result;
};
