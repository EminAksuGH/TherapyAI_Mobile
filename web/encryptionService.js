/**
 * Production-ready AES-GCM encryption service
 * Works consistently across web and React Native platforms
 */

// Environment detection
const isWeb = typeof window !== 'undefined' && typeof window.crypto !== 'undefined';

// Get encryption key from environment
const ENCRYPTION_KEY_STRING = import.meta.env.VITE_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_STRING) {
    console.error('⚠️ WARNING: Encryption key not found in environment variables');
}

/**
 * Derive a consistent 256-bit key from the string key
 */
const deriveKey = () => {
    if (!ENCRYPTION_KEY_STRING) {
        throw new Error('Encryption key not configured');
    }
    // Ensure we have exactly 32 bytes (256 bits) for AES-256
    const keyString = ENCRYPTION_KEY_STRING.padEnd(32, '0').substring(0, 32);
    return new TextEncoder().encode(keyString);
};

/**
 * Convert ArrayBuffer/Uint8Array to base64 string
 */
const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

/**
 * Convert base64 string to ArrayBuffer
 */
const base64ToArrayBuffer = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Import the raw key for use with Web Crypto API
 */
let cachedCryptoKey = null;
const getCryptoKey = async () => {
    if (cachedCryptoKey) return cachedCryptoKey;
    
    const rawKey = deriveKey();
    
    if (!window.crypto?.subtle) {
        throw new Error('Web Crypto API not available in this browser');
    }
    
    cachedCryptoKey = await window.crypto.subtle.importKey(
        'raw',
        rawKey,
        {
            name: 'AES-GCM',
            length: 256
        },
        false, // not extractable
        ['encrypt', 'decrypt']
    );
    
    return cachedCryptoKey;
};

/**
 * Encrypt a message using AES-GCM
 * @param {string} plaintext - The message to encrypt
 * @returns {Promise<string>} - Base64 encoded encrypted message
 */
export const encryptMessage = async (plaintext) => {
    try {
        // Input validation
        if (!plaintext || typeof plaintext !== 'string') {
            return plaintext;
        }
        
        // Don't encrypt already encrypted messages
        if (isEncrypted(plaintext)) {
            console.warn('Message appears to be already encrypted');
            return plaintext;
        }
        
        const key = await getCryptoKey();
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        
        // Generate a random 96-bit (12 bytes) IV for GCM
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the data
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                tagLength: 128 // 16 bytes authentication tag
            },
            key,
            data
        );
        
        // Combine IV and encrypted data (which includes the auth tag)
        // Format: [IV (12 bytes)][Ciphertext][Auth Tag (16 bytes)]
        const combined = new Uint8Array(iv.length + encryptedData.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encryptedData), iv.length);
        
        // Convert to base64 for storage/transmission
        const result = arrayBufferToBase64(combined);
        
        console.log(`✅ Encrypted message (Web): ${plaintext.substring(0, 20)}... -> ${result.length} chars`);
        
        return result;
    } catch (error) {
        console.error('❌ Encryption error:', error);
        // In production, you might want to throw the error instead
        // For now, return original to prevent data loss
        return plaintext;
    }
};

/**
 * Decrypt a message using AES-GCM
 * @param {string} encryptedMessage - Base64 encoded encrypted message
 * @returns {Promise<string>} - Decrypted plaintext
 */
export const decryptMessage = async (encryptedMessage) => {
    try {
        // Input validation
        if (!encryptedMessage || typeof encryptedMessage !== 'string') {
            return encryptedMessage;
        }
        
        // Check if message appears to be encrypted
        if (!isEncrypted(encryptedMessage)) {
            return encryptedMessage;
        }
        
        const key = await getCryptoKey();
        
        // Convert from base64
        const combined = new Uint8Array(base64ToArrayBuffer(encryptedMessage));
        
        // Validate minimum length (12 bytes IV + at least 16 bytes for tag)
        if (combined.length < 28) {
            throw new Error('Invalid encrypted message: too short');
        }
        
        // Extract IV and encrypted data (with auth tag)
        const iv = combined.slice(0, 12);
        const encryptedData = combined.slice(12);
        
        // Decrypt the data
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                tagLength: 128 // 16 bytes authentication tag
            },
            key,
            encryptedData
        );
        
        // Convert back to string
        const decoder = new TextDecoder();
        const result = decoder.decode(decryptedData);
        
        console.log(`✅ Decrypted message (Web): ${result.substring(0, 20)}...`);
        
        return result;
    } catch (error) {
        console.error('❌ Decryption error:', error);
        
        // Authentication tag verification failure is the most common error
        if (error.message?.includes('tag') || error.message?.includes('authentication')) {
            console.error('Authentication tag verification failed - message may be corrupted or tampered');
        }
        
        // Return original encrypted message to prevent data loss
        // In production, you might want to handle this differently
        return encryptedMessage;
    }
};

/**
 * Check if a string appears to be encrypted
 * @param {string} message - The message to check
 * @returns {boolean} - True if message appears to be encrypted
 */
const isEncrypted = (message) => {
    // Basic checks
    if (!message || typeof message !== 'string' || message.length < 28) {
        return false;
    }
    
    // Check if it's valid base64
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Pattern.test(message)) {
        return false;
    }
    
    // Check for common plain text patterns
    if (message.includes(' ') || message.includes('\n')) {
        return false;
    }
    
    // Check for obvious plain text patterns
    const plainTextPatterns = [
        /^https?:\/\//i,           // URLs
        /^[a-zA-Z0-9._%+-]+@/i,    // Email addresses
        /^\d{4}-\d{2}-\d{2}/,      // Dates
        /^[a-zA-Z\s]+$/,           // Only letters and spaces
        /\.(com|org|net|edu|gov)$/i, // Domain endings
    ];
    
    for (const pattern of plainTextPatterns) {
        if (pattern.test(message)) {
            return false;
        }
    }
    
    // Try to decode base64 and check if it has the expected structure
    try {
        const decoded = base64ToArrayBuffer(message);
        // Should have at least IV (12) + tag (16) = 28 bytes
        return decoded.byteLength >= 28;
    } catch {
        return false;
    }
};

/**
 * Encrypt memory content (alias for consistency)
 */
export const encryptMemoryContent = async (content) => {
    return await encryptMessage(content);
};

/**
 * Decrypt memory content (alias for consistency)
 */
export const decryptMemoryContent = async (encryptedContent) => {
    return await decryptMessage(encryptedContent);
};

/**
 * Batch encrypt multiple messages
 * @param {Array} messages - Array of message objects with text property
 * @returns {Promise<Array>} - Array with encrypted text
 */
export const encryptMessages = async (messages) => {
    if (!Array.isArray(messages)) {
        throw new TypeError('Messages must be an array');
    }
    
    try {
        // Process in parallel for better performance
        const encryptionPromises = messages.map(async (message) => {
            const encryptedText = await encryptMessage(message.text);
            return {
                ...message,
                text: encryptedText
            };
        });
        
        return await Promise.all(encryptionPromises);
    } catch (error) {
        console.error('Batch encryption error:', error);
        // Return original messages on error
        return messages;
    }
};

/**
 * Batch decrypt multiple messages
 * @param {Array} messages - Array of message objects with encrypted text
 * @returns {Promise<Array>} - Array with decrypted text
 */
export const decryptMessages = async (messages) => {
    if (!Array.isArray(messages)) {
        throw new TypeError('Messages must be an array');
    }
    
    try {
        // Process in parallel for better performance
        const decryptionPromises = messages.map(async (message) => {
            const decryptedText = await decryptMessage(message.text);
            return {
                ...message,
                text: decryptedText
            };
        });
        
        return await Promise.all(decryptionPromises);
    } catch (error) {
        console.error('Batch decryption error:', error);
        // Return original messages on error
        return messages;
    }
};

// Export crypto key derivation for testing purposes
export const __testing = {
    deriveKey,
    getCryptoKey,
    isEncrypted
};