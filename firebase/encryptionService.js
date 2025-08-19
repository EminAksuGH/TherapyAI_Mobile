/**
 * Production-ready AES-GCM encryption service
 * Works consistently across web and React Native platforms
 */

// Polyfill for React Native to support crypto.getRandomValues
import 'react-native-get-random-values';
// Polyfill atob/btoa for React Native
import {decode as atobPolyfill, encode as btoaPolyfill} from 'base-64';
if (typeof global.atob === 'undefined') {
    global.atob = atobPolyfill;
}
if (typeof global.btoa === 'undefined') {
    global.btoa = btoaPolyfill;
}

// Environment detection
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isWeb = typeof window !== 'undefined' && !isReactNative;

// Get encryption key from environment
// Prefer non-public key if available
const ENCRYPTION_KEY_STRING = 
    process.env.EXPO_ENCRYPTION_KEY ||
    process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 
    process.env.VITE_ENCRYPTION_KEY;

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
    
    // Use subtle crypto API (available on both web and React Native with polyfill)
    const subtle = globalThis.crypto?.subtle || 
                   (typeof window !== 'undefined' && window.crypto?.subtle);
    
    if (!subtle) {
        throw new Error('Web Crypto API not available. Make sure polyfills are properly imported.');
    }
    
    cachedCryptoKey = await subtle.importKey(
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
 * @param {string} plaintext
 * @returns {Promise<string>}
 */
export const encryptMessage = async (plaintext) => {
    try {
        if (!plaintext || typeof plaintext !== 'string') {
            return plaintext;
        }
        
        if (isEncrypted(plaintext)) {
            console.warn('Message appears to be already encrypted');
            return plaintext;
        }

        if (isReactNative) {
            try {
                const AesGcmCryptoLib = require('react-native-aes-gcm-crypto');
                const AesGcmCrypto = AesGcmCryptoLib.default || AesGcmCryptoLib;

                const rawKey = deriveKey();
                const keyBase64 = arrayBufferToBase64(rawKey);

                const result = await AesGcmCrypto.encrypt(plaintext, false, keyBase64);

                const ivBytes = new Uint8Array(base64ToArrayBuffer(result.iv));
                const contentBytes = new Uint8Array(base64ToArrayBuffer(result.content));
                const tagBytes = new Uint8Array(base64ToArrayBuffer(result.tag));

                if (ivBytes.length !== 12) {
                    throw new Error(`IV must be 12 bytes for AES-GCM, got ${ivBytes.length}`);
                }
                if (tagBytes.length !== 16) {
                    throw new Error(`Tag must be 16 bytes for AES-GCM, got ${tagBytes.length}`);
                }

                const combined = new Uint8Array(ivBytes.length + contentBytes.length + tagBytes.length);
                combined.set(ivBytes, 0);
                combined.set(contentBytes, ivBytes.length);
                combined.set(tagBytes, ivBytes.length + contentBytes.length);

                const finalBase64 = arrayBufferToBase64(combined);
                console.log(`✅ Encrypted message (Mobile): ${plaintext.substring(0, 20)}... -> ${finalBase64.length} chars`);
                return finalBase64;
            } catch (nativeError) {
                console.error('❌ Native AES-GCM encryption failed on mobile:', nativeError);
                throw nativeError;
            }
        }

        // Web or environments with SubtleCrypto
        const key = await getCryptoKey();
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        
        // Generate a random 96-bit (12 bytes) IV for GCM
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Get subtle crypto API
        const subtle = globalThis.crypto?.subtle || 
                       (typeof window !== 'undefined' && window.crypto?.subtle);
        
        // Encrypt the data
        const encryptedData = await subtle.encrypt(
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
        // Throw to ensure callers do NOT save plaintext on failure
        throw error;
    }
};

/**
 * @param {string} encryptedMessage
 * @returns {Promise<string>}
 */
export const decryptMessage = async (encryptedMessage) => {
    try {
        if (!encryptedMessage || typeof encryptedMessage !== 'string') {
            return encryptedMessage;
        }
        
        if (!isEncrypted(encryptedMessage)) {
            return encryptedMessage;
        }
        
        if (isReactNative) {
            try {
                const AesGcmCryptoLib = require('react-native-aes-gcm-crypto');
                const AesGcmCrypto = AesGcmCryptoLib.default || AesGcmCryptoLib;

                const keyBase64 = arrayBufferToBase64(deriveKey());
                const combined = new Uint8Array(base64ToArrayBuffer(encryptedMessage));

                const ivSize = 12;
                const tagSize = 16;
                if (combined.length < ivSize + tagSize) {
                    throw new Error('Invalid encrypted message: too short');
                }
                const iv = combined.slice(0, ivSize);
                const encryptedWithTag = combined.slice(ivSize);
                const tag = encryptedWithTag.slice(-tagSize);
                const content = encryptedWithTag.slice(0, -tagSize);

                const plaintext = await AesGcmCrypto.decrypt(
                    arrayBufferToBase64(content),
                    keyBase64,
                    arrayBufferToBase64(iv),
                    arrayBufferToBase64(tag),
                    false
                );
                console.log(`✅ Decrypted message (Mobile): ${plaintext.substring(0, 20)}...`);
                return plaintext;
            } catch (nativeDecErr) {
                console.error('❌ Native AES-GCM decryption failed on mobile:', nativeDecErr);
            }
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
        
        // Get subtle crypto API
        const subtle = globalThis.crypto?.subtle || 
                       (typeof window !== 'undefined' && window.crypto?.subtle);
        
        // Decrypt the data
        const decryptedData = await subtle.decrypt(
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