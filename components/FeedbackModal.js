import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const FeedbackModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  aiMessage, 
  userMessage 
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { colors } = useTheme();

  const feedbackReasons = [
    { id: 'inappropriate', label: 'Uygunsuz İçerik', icon: 'warning-outline', color: '#E74C3C' },
    { id: 'not_enough', label: 'Yetersiz Yanıt', icon: 'ellipsis-horizontal-outline', color: '#FFC107' },
    { id: 'incorrect', label: 'Yanlış Bilgi', icon: 'close-circle-outline', color: '#DC3545' },
    { id: 'unhelpful', label: 'Yardımcı Değil', icon: 'thumbs-down-outline', color: '#FF6B6B' },
    { id: 'too_generic', label: 'Çok Genel', icon: 'copy-outline', color: '#9C88FF' },
    { id: 'off_topic', label: 'Konuyla İlgisiz', icon: 'navigate-outline', color: '#17A2B8' },
    { id: 'technical_issue', label: 'Teknik Sorun', icon: 'bug-outline', color: '#6C757D' },
    { id: 'other', label: 'Diğer', icon: 'help-circle-outline', color: '#495057' }
  ];

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Hata', 'Lütfen bir geri bildirim türü seçin.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Hata', 'Lütfen açıklama yazın.');
      return;
    }

    setSubmitting(true);
    
    try {
      await onSubmit({
        userMessage,
        aiMessage,
        reason: selectedReason,
        description: description.trim()
      });
      
      // Reset form
      setSelectedReason('');
      setDescription('');
      onClose();
      
      Alert.alert('Teşekkürler!', 'Geri bildiriminiz başarıyla gönderildi.');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Hata', 'Geri bildirim gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Geri Bildirim</Text>
            <TouchableOpacity 
              onPress={handleClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              AI yanıtı hakkında geri bildirim verin
            </Text>

            <View style={[styles.messagePreview, { backgroundColor: colors.inputBackground || colors.accent }]}>
              <View style={[styles.userMessagePreview, { borderBottomColor: colors.border }]}>
                <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>Mesajınız:</Text>
                <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={2}>
                  "{userMessage?.length > 100 ? userMessage.substring(0, 100) + '...' : userMessage}"
                </Text>
              </View>
              <View style={styles.aiMessagePreview}>
                <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>AI Yanıtı:</Text>
                <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={3}>
                  "{aiMessage?.length > 100 ? aiMessage.substring(0, 100) + '...' : aiMessage}"
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Geri Bildirim Türü</Text>
            <View style={styles.reasonsContainer}>
              {feedbackReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonButton,
                    selectedReason === reason.id && styles.reasonButtonSelected,
                    selectedReason === reason.id && { borderColor: reason.color }
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                >
                  <Ionicons 
                    name={reason.icon} 
                    size={24} 
                    color={selectedReason === reason.id ? reason.color : '#7F8C8D'} 
                  />
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason.id && { color: reason.color }
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Detaylı açıklama (zorunlu):</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Lütfen sorunu veya önerinizi detaylı olarak açıklayın..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />
            <View style={styles.characterCount}>
              <Text style={styles.characterCountText}>
                {description.length}/1000
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedReason || !description.trim() || submitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || !description.trim() || submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Gönderiliyor...' : 'Geri Bildirim Gönder'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 20,
    textAlign: 'center',
  },
  messagePreview: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  userMessagePreview: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  aiMessagePreview: {
    // No additional styles needed
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6C757D',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 25,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '45%',
    justifyContent: 'center',
  },
  reasonButtonSelected: {
    backgroundColor: 'white',
    borderWidth: 2,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#7F8C8D',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
    marginBottom: 5,
    minHeight: 100,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  characterCountText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default FeedbackModal; 