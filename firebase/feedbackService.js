import { 
    collection,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    increment
} from 'firebase/firestore';
import { db } from './firebase';
import { encryptMessage } from './encryptionService';

/**
 * Save user feedback about an AI response
 * Note: Feedback is stored as plain text (not encrypted) for admin review
 * @param {string} userId - The user ID
 * @param {string} userMessage - The original user message
 * @param {string} aiMessage - The AI response being reviewed
 * @param {string} reason - The reason for feedback (inappropriate, not_enough, etc.)
 * @param {string} description - Detailed description from user
 * @returns {Promise<string>} - The feedback document ID
 */
export const saveFeedback = async (userId, userMessage, aiMessage, reason, description) => {
    try {
        // Create feedback document with all required fields
        const feedbackData = {
            userId: userId,
            userMessage: userMessage, // Plain text - not encrypted for admin review
            aiMessage: aiMessage, // Plain text - not encrypted for admin review  
            reason: reason,
            description: description,
            createdAt: serverTimestamp(),
            status: 'pending', // pending, reviewed, resolved
            reviewedAt: null,
            reviewedBy: null,
            notes: null // For admin notes
        };

        // Save to feedback collection
                const feedbackRef = await addDoc(collection(db, 'feedback'), feedbackData);
        
        return feedbackRef.id;
    } catch (error) {
        console.error('Error saving feedback:', error);
        throw new Error('Geri bildirim kaydedilemedi. Lütfen tekrar deneyin.');
    }
};

/**
 * Get user's feedback history (for admin or user review)
 * @param {string} userId - The user ID
 * @param {number} limit - Maximum number of feedback entries to retrieve
 * @returns {Promise<Array>} - Array of feedback entries
 */
export const getUserFeedback = async (userId, limit = 10) => {
    try {
        const { query, where, orderBy, getDocs } = await import('firebase/firestore');
        
        const feedbackQuery = query(
            collection(db, 'feedback'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(limit)
        );

        const querySnapshot = await getDocs(feedbackQuery);
        const feedback = [];

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            feedback.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date()
            });
        }

        return feedback;
    } catch (error) {
        console.error('Error getting user feedback:', error);
        return [];
    }
};

/**
 * Get feedback statistics for a user (optional utility function)
 * @param {string} userId - The user ID
 * @returns {Promise<number>} - Number of feedback submissions by this user
 */
export const getUserFeedbackCount = async (userId) => {
    try {
        const { query, where, getDocs } = await import('firebase/firestore');
        
        const feedbackRef = collection(db, 'feedback');
        const q = query(feedbackRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error('Error getting user feedback count:', error);
        return 0;
    }
};

/**
 * Constants for feedback reasons (to ensure consistency)
 */
export const FEEDBACK_REASONS = {
    INAPPROPRIATE: 'inappropriate',
    NOT_ENOUGH: 'not_enough', 
    INCORRECT: 'incorrect',
    UNHELPFUL: 'unhelpful',
    TOO_GENERIC: 'too_generic',
    OFF_TOPIC: 'off_topic',
    TECHNICAL_ISSUE: 'technical_issue',
    OTHER: 'other'
};

/**
 * Get human-readable reason labels
 * @param {string} reason - The reason code
 * @returns {string} - Human-readable label in Turkish
 */
export const getReasonLabel = (reason) => {
    const labels = {
        [FEEDBACK_REASONS.INAPPROPRIATE]: 'Uygunsuz İçerik',
        [FEEDBACK_REASONS.NOT_ENOUGH]: 'Yetersiz Yanıt',
        [FEEDBACK_REASONS.INCORRECT]: 'Yanlış Bilgi',
        [FEEDBACK_REASONS.UNHELPFUL]: 'Yardımcı Değil',
        [FEEDBACK_REASONS.TOO_GENERIC]: 'Çok Genel',
        [FEEDBACK_REASONS.OFF_TOPIC]: 'Konuyla İlgisiz',
        [FEEDBACK_REASONS.TECHNICAL_ISSUE]: 'Teknik Sorun',
        [FEEDBACK_REASONS.OTHER]: 'Diğer'
    };
    
    return labels[reason] || 'Bilinmeyen Sebep';
};

/**
 * Update feedback status (for admin use)
 * @param {string} feedbackId - The feedback document ID
 * @param {string} status - The new status (pending, reviewed, resolved)
 * @param {string} adminNote - Optional admin note
 * @returns {Promise<boolean>} - Success status
 */
export const updateFeedbackStatus = async (feedbackId, status, adminNote = '') => {
    try {
        const feedbackRef = doc(db, 'feedback', feedbackId);
        await updateDoc(feedbackRef, {
            status,
            reviewedAt: status !== 'pending' ? serverTimestamp() : null,
            notes: adminNote
        });

        return true;
    } catch (error) {
        console.error('Error updating feedback status:', error);
        return false;
    }
}; 