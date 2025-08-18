import React, { useState } from 'react';
import styles from './FeedbackModal.module.css';

const FeedbackModal = ({ isOpen, onClose, onSubmit, aiMessage, userMessage }) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const feedbackReasons = [
        { value: 'inappropriate', label: 'Uygunsuz İçerik' },
        { value: 'not_enough', label: 'Yetersiz Yanıt' },
        { value: 'incorrect', label: 'Yanlış Bilgi' },
        { value: 'unhelpful', label: 'Yardımcı Değil' },
        { value: 'too_generic', label: 'Çok Genel' },
        { value: 'off_topic', label: 'Konuyla İlgisiz' },
        { value: 'technical_issue', label: 'Teknik Sorun' },
        { value: 'other', label: 'Diğer' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedReason) {
            alert('Lütfen bir sebep seçin.');
            return;
        }

        if (!description.trim()) {
            alert('Lütfen açıklama yazın.');
            return;
        }

        setIsSubmitting(true);
        
        try {
            await onSubmit({
                reason: selectedReason,
                description: description.trim(),
                userMessage,
                aiMessage
            });
            
            // Reset form
            setSelectedReason('');
            setDescription('');
            onClose();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Geri bildirim gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setSelectedReason('');
            setDescription('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>AI Yanıtı Hakkında Geri Bildirim</h3>
                    <button 
                        className={styles.closeButton} 
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>
                
                <div className={styles.messagePreview}>
                    <div className={styles.userMessagePreview}>
                        <strong>Mesajınız:</strong>
                        <p>"{userMessage?.length > 100 ? userMessage.substring(0, 100) + '...' : userMessage}"</p>
                    </div>
                    <div className={styles.aiMessagePreview}>
                        <strong>AI Yanıtı:</strong>
                        <p>"{aiMessage?.length > 100 ? aiMessage.substring(0, 100) + '...' : aiMessage}"</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.feedbackForm}>
                    <div className={styles.reasonSection}>
                        <label className={styles.sectionLabel}>Sorun türü nedir?</label>
                        <div className={styles.reasonGrid}>
                            {feedbackReasons.map((reason) => (
                                <label key={reason.value} className={styles.reasonOption}>
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={reason.value}
                                        checked={selectedReason === reason.value}
                                        onChange={(e) => setSelectedReason(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <span className={styles.reasonLabel}>{reason.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={styles.descriptionSection}>
                        <label htmlFor="description" className={styles.sectionLabel}>
                            Detaylı açıklama (zorunlu):
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Lütfen sorunu veya önerinizi detaylı olarak açıklayın..."
                            className={styles.descriptionTextarea}
                            rows={4}
                            disabled={isSubmitting}
                            maxLength={1000}
                        />
                        <div className={styles.characterCount}>
                            {description.length}/1000
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button 
                            type="button" 
                            onClick={handleClose} 
                            className={styles.cancelButton}
                            disabled={isSubmitting}
                        >
                            İptal
                        </button>
                        <button 
                            type="submit" 
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Gönderiliyor...' : 'Geri Bildirim Gönder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal; 