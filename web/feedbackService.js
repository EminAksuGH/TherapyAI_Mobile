import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Save feedback to Firestore
 * Note: Feedback is stored as plain text (not encrypted) for admin review
 * @param {string} userId - The user ID
 * @param {string} userMessage - The user's message that prompted the AI response
 * @param {string} aiMessage - The AI response being reported
 * @param {string} reason - The reason for feedback (inappropriate, not_enough, etc.)
 * @param {string} description - User's detailed description of the issue
 * @returns {Promise<string>} - The feedback document ID
 */
export const saveFeedback = async (userId, userMessage, aiMessage, reason, description) => {
    try {
        // Create feedback document with all required fields
        const feedbackData = {
            userId: userId,
            userMessage: userMessage, // Plain text - not encrypted
            aiMessage: aiMessage, // Plain text - not encrypted  
            reason: reason,
            description: description,
            createdAt: serverTimestamp(),
            status: 'pending', // pending, reviewed, resolved
            reviewedAt: null,
            reviewedBy: null,
            notes: null // For admin notes
        };

        // Save to feedback collection
        const feedbackRef = await addDoc(collection(db, "feedback"), feedbackData);
        
        console.log("Feedback saved successfully with ID:", feedbackRef.id);
        return feedbackRef.id;
    } catch (error) {
        console.error("Error saving feedback:", error);
        throw error;
    }
};

/**
 * Get feedback statistics for a user (optional utility function)
 * @param {string} userId - The user ID
 * @returns {Promise<number>} - Number of feedback submissions by this user
 */
export const getUserFeedbackCount = async (userId) => {
    try {
        const feedbackRef = collection(db, "feedback");
        const q = query(feedbackRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error("Error getting user feedback count:", error);
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