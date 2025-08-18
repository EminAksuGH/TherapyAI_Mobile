// Use react-native-aes-gcm-crypto with GPT's suggested fixes
const AesGcmCryptoLib = require('react-native-aes-gcm-crypto');
const AesGcmCrypto = AesGcmCryptoLib.default;

// Debug: Check what's available in the imported library
console.log('🔍 AesGcmCrypto:', AesGcmCrypto);
console.log('🔍 AesGcmCrypto methods:', Object.keys(AesGcmCrypto || {}));
console.log('🔍 encrypt method:', typeof AesGcmCrypto?.encrypt);
console.log('🔍 decrypt method:', typeof AesGcmCrypto?.decrypt);
console.log('🔍 encryptWebStyle method:', typeof AesGcmCrypto?.encryptWebStyle);
console.log('🔍 decryptWebStyle method:', typeof AesGcmCrypto?.decryptWebStyle);

// Also check the raw lib
console.log('🔍 Raw AesGcmCryptoLib:', AesGcmCryptoLib);
console.log('🔍 Raw methods:', Object.keys(AesGcmCryptoLib || {}));

const ENCRYPTION_KEY_STRING = 
    process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 
    process.env.VITE_ENCRYPTION_KEY;

// ✅ 1. ORTAK KEY ÜRETİMİ (GPT's suggestion)
const getRawKey = () => {
    const keyString = ENCRYPTION_KEY_STRING.padEnd(32, '0').substring(0, 32);
    return new TextEncoder().encode(keyString);
};

const getBase64Key = () => {
    const key = getRawKey();
    return btoa(String.fromCharCode(...key));
};

// Test key consistency
console.log('🔑 Key test - Raw key length:', getRawKey().length);
console.log('🔑 Key test - Base64 key:', getBase64Key().substring(0, 20) + '...');

/**
 * Convert Uint8Array to base64 string
 * @param {Uint8Array} uint8Array 
 * @returns {string}
 */
const uint8ArrayToBase64 = (uint8Array) => {
    return btoa(String.fromCharCode(...uint8Array));
};

/**
 * Convert base64 string to Uint8Array
 * @param {string} base64String 
 * @returns {Uint8Array}
 */
const base64ToUint8Array = (base64String) => {
    const binaryString = atob(base64String);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }
    return uint8Array;
};

/**
 * ✅ 3. FIXED encryptWebStyle() - GPT's exact implementation
 */
const encryptWebStyle = async (plainText, inBinary, keyBase64) => {
    // Check if native encrypt method exists
    if (!AesGcmCrypto || typeof AesGcmCrypto.encrypt !== 'function') {
        throw new Error('AesGcmCrypto.encrypt method not available. Native module may not be properly linked.');
    }

    const result = await AesGcmCrypto.encrypt(plainText, inBinary, keyBase64);

    const ivBytes = base64ToUint8Array(result.iv);        // 12 bytes
    const contentBytes = base64ToUint8Array(result.content);
    const tagBytes = base64ToUint8Array(result.tag);       // 16 bytes

    // ✅ 2. Enforce IV length (12 bytes)
    if (ivBytes.length !== 12) {
        throw new Error(`IV must be 12 bytes for AES-GCM, got ${ivBytes.length}`);
    }
    if (tagBytes.length !== 16) {
        throw new Error(`Tag must be 16 bytes for AES-GCM, got ${tagBytes.length}`);
    }

    console.log('🔐 Mobile encrypt - IV:', ivBytes.length, 'Content:', contentBytes.length, 'Tag:', tagBytes.length);

    // Web-compatible: content + tag
    const encryptedDataWithTag = new Uint8Array(contentBytes.length + tagBytes.length);
    encryptedDataWithTag.set(contentBytes);
    encryptedDataWithTag.set(tagBytes, contentBytes.length);

    // Final format: IV (12) + EncryptedContent+Tag
    const combined = new Uint8Array(ivBytes.length + encryptedDataWithTag.length);
    combined.set(ivBytes);
    combined.set(encryptedDataWithTag, ivBytes.length);

    return uint8ArrayToBase64(combined); // like web does
};

/**
 * ✅ 4. FIXED decryptWebStyle() - GPT's exact implementation with error handling
 */
const decryptWebStyle = async (base64Ciphertext, keyBase64, isBinary) => {
    const combined = base64ToUint8Array(base64Ciphertext);

    const ivSize = 12;
    const tagSize = 16;

    if (combined.length < ivSize + tagSize) {
        throw new Error(`Message too short: ${combined.length}, minimum: ${ivSize + tagSize}`);
    }

    const iv = combined.slice(0, ivSize);
    const encryptedWithTag = combined.slice(ivSize);
    const tag = encryptedWithTag.slice(-tagSize);
    const content = encryptedWithTag.slice(0, -tagSize);

    console.log('🔐 Mobile decrypt - IV:', iv.length, 'Content:', content.length, 'Tag:', tag.length);

    // Check if native decrypt method exists
    if (!AesGcmCrypto || typeof AesGcmCrypto.decrypt !== 'function') {
        throw new Error('AesGcmCrypto.decrypt method not available. Native module may not be properly linked.');
    }

    return AesGcmCrypto.decrypt(
        uint8ArrayToBase64(content),
        keyBase64,
        uint8ArrayToBase64(iv),
        uint8ArrayToBase64(tag),
        isBinary
    );
};

/**
 * Encrypt a message - MOBILE SIDE (uses base64 key)
 * @param {string} message - The message to encrypt
 * @returns {Promise<string>} - Web-compatible encrypted message
 */
export const encryptMessage = async (message) => {
    try {
        if (!message || typeof message !== 'string') {
            return message;
        }
        
        const keyBase64 = getBase64Key(); // Mobile uses base64 key
        
        console.log('🔐 Mobile encrypting:', message.substring(0, 20) + '...');
        const encryptedResult = await encryptWebStyle(message, false, keyBase64);
        console.log('✅ Mobile encrypted length:', encryptedResult.length);
        
        return encryptedResult;
    } catch (error) {
        console.error('❌ Mobile encryption error:', error);
        throw new Error('Mobile encryption failed');
    }
};

/**
 * Decrypt a message - MOBILE SIDE (handles web-encrypted messages)
 * @param {string} encryptedMessage - Web or mobile encrypted message
 * @returns {Promise<string>} - Decrypted message
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
        
        const keyBase64 = getBase64Key(); // Mobile uses base64 key
        
        console.log('🔐 Mobile decrypting length:', encryptedMessage.length);
        console.log('🔐 First 50 chars:', encryptedMessage.substring(0, 50));
        
        const decryptedResult = await decryptWebStyle(encryptedMessage, keyBase64, false);
        console.log('✅ Mobile decryption succeeded:', decryptedResult.substring(0, 20) + '...');
        
        return decryptedResult;
    } catch (error) {
        console.error('❌ Mobile decryption error:', error);
        // Return original encrypted message so user can see something
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

