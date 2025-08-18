const ENCRYPTION_KEY_STRING = import.meta.env.VITE_ENCRYPTION_KEY;

// Convert string key to CryptoKey object
let cryptoKey = null;

// ✅ Ensure EXACT same key derivation as mobile (GPT's suggestion)
const getRawKey = () => {
    const keyString = ENCRYPTION_KEY_STRING.padEnd(32, '0').substring(0, 32);
    return new TextEncoder().encode(keyString);
};

// Debug key consistency (same as mobile)
console.log('🔑 Web - Raw key length:', getRawKey().length);
console.log('🔑 Web - Base64 equivalent:', btoa(String.fromCharCode(...getRawKey())).substring(0, 20) + '...');

/**
 * Initialize the crypto key from the string
 */
const initializeCryptoKey = async () => {
    if (cryptoKey) return cryptoKey;
    
    try {
        // Use same key derivation as mobile
        const keyBuffer = getRawKey(); // ✅ Same as mobile
        
        cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
        
        return cryptoKey;
    } catch (error) {
        console.error('Error initializing crypto key:', error);
        throw error;
    }
};

/**
 * Encrypt a message using AES-GCM - WEB SIDE
 * @param {string} message - The message to encrypt
 * @returns {Promise<string>} - The encrypted message (mobile-compatible format)
 */
export const encryptMessage = async (message) => {
    try {
        if (!message || typeof message !== 'string') {
            return message;
        }
        
        const key = await initializeCryptoKey();
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        // ✅ Generate exactly 12-byte IV (same as mobile requirement)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Validate IV length (same as mobile)
        if (iv.length !== 12) {
            throw new Error(`IV must be 12 bytes for AES-GCM, got ${iv.length}`);
        }
        
        console.log('🔐 Web encrypting:', message.substring(0, 20) + '...');
        console.log('🔐 Web encrypt - IV length:', iv.length);
        
        // Encrypt the data (Web Crypto API embeds tag automatically)
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            data
        );
        
        // Web format: IV + encrypted_data_with_embedded_tag
        // This matches mobile expectation: iv(12) + (content + tag)
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        const result = btoa(String.fromCharCode(...combined));
        console.log('✅ Web encrypted length:', result.length);
        
        return result;
    } catch (error) {
        console.error('❌ Web encryption error:', error);
        // In case of encryption failure, return original message
        return message;
    }
};

/**
 * Decrypt a message using AES-GCM - WEB SIDE (handles mobile-encrypted messages)
 * @param {string} encryptedMessage - The encrypted message to decrypt (base64 encoded)
 * @returns {Promise<string>} - The decrypted message
 */
export const decryptMessage = async (encryptedMessage) => {
    try {
        if (!encryptedMessage || typeof encryptedMessage !== 'string') {
            return encryptedMessage;
        }
        
        // Check if the message looks like it's encrypted
        if (!isEncrypted(encryptedMessage)) {
            return encryptedMessage;
        }
        
        console.log('🔐 Web decrypting length:', encryptedMessage.length);
        console.log('🔐 First 50 chars:', encryptedMessage.substring(0, 50));
        
        const key = await initializeCryptoKey();
        
        // Convert from base64
        const combined = new Uint8Array(
            atob(encryptedMessage)
                .split('')
                .map(char => char.charCodeAt(0))
        );
        
        // ✅ Validate format (same as mobile)
        const ivSize = 12;
        const tagSize = 16;
        
        if (combined.length < ivSize + tagSize) {
            throw new Error(`Message too short: ${combined.length}, minimum: ${ivSize + tagSize}`);
        }
        
        // Extract IV (first 12 bytes) and encrypted data (rest)
        const iv = combined.slice(0, ivSize);
        const encryptedData = combined.slice(ivSize);
        
        console.log('🔐 Web decrypt - IV:', iv.length, 'Encrypted data:', encryptedData.length);
        
        // Validate IV length
        if (iv.length !== 12) {
            throw new Error(`Invalid IV length: ${iv.length}, expected 12`);
        }
        
        // Decrypt the data (Web Crypto API expects tag embedded in encrypted data)
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encryptedData // This contains content + tag (mobile format)
        );
        
        // Convert back to string
        const decoder = new TextDecoder();
        const result = decoder.decode(decrypted);
        console.log('✅ Web decryption succeeded:', result.substring(0, 20) + '...');
        
        return result;
    } catch (error) {
        console.error('❌ Web decryption error:', error);
        // In case of decryption failure, return original message
        return encryptedMessage;
    }
};

/**
 * Simple heuristic to check if a message appears to be encrypted
 * @param {string} message - The message to check
 * @returns {boolean} - Whether the message appears to be encrypted
 */
const isEncrypted = (message) => {
    // Encrypted messages are base64-encoded and should be at least 16 characters
    if (message.length < 16) return false;
    
    // Check for base64 pattern - if it matches base64 and is long enough, it's likely encrypted
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Pattern.test(message)) return false;
    
    // Additional heuristics for encrypted content:
    // 1. Encrypted messages are typically longer than 32 characters (due to IV + encrypted data)
    // 2. They have a more random character distribution
    // 3. They don't have spaces (base64 doesn't contain spaces)
    
    if (message.length < 24) return false; // Too short to be our encrypted format
    
    // Check if it contains spaces - encrypted base64 shouldn't have spaces
    if (message.includes(' ')) return false;
    
    // Check for very obvious plain text patterns (but be more careful about short sequences)
    const obviousPlainTextPatterns = [
        /\b(hello|merhaba|nasılsın|how are you|selam)\b/i,  // Full words only
        /^[a-zA-Z\s]{3,}$/,  // Only letters and spaces (plain text)
        /\.(com|org|net|tr)$/i,  // URLs
        /@[a-zA-Z0-9]/i  // Email addresses
    ];
    
    for (const pattern of obviousPlainTextPatterns) {
        if (pattern.test(message)) {
            return false; // Likely plain text
        }
    }
    
    return true; // Likely encrypted
};

/**
 * Encrypt memory content
 * @param {string} content - The memory content to encrypt
 * @returns {Promise<string>} - The encrypted content
 */
export const encryptMemoryContent = async (content) => {
    return await encryptMessage(content);
};

/**
 * Decrypt memory content
 * @param {string} encryptedContent - The encrypted memory content to decrypt
 * @returns {Promise<string>} - The decrypted content
 */
export const decryptMemoryContent = async (encryptedContent) => {
    return await decryptMessage(encryptedContent);
};

/**
 * Batch encrypt multiple messages
 * @param {Array} messages - Array of message objects with text property
 * @returns {Promise<Array>} - Array of messages with encrypted text
 */
export const encryptMessages = async (messages) => {
    const encryptedMessages = [];
    for (const message of messages) {
        const encryptedText = await encryptMessage(message.text);
        encryptedMessages.push({
            ...message,
            text: encryptedText
        });
    }
    return encryptedMessages;
};

/**
 * Batch decrypt multiple messages
 * @param {Array} messages - Array of message objects with encrypted text
 * @returns {Promise<Array>} - Array of messages with decrypted text
 */
export const decryptMessages = async (messages) => {
    const decryptedMessages = [];
    for (const message of messages) {
        const decryptedText = await decryptMessage(message.text);
        decryptedMessages.push({
            ...message,
            text: decryptedText
        });
    }
    return decryptedMessages;
}; 