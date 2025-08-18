import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  deleteDoc, 
  writeBatch, 
  onSnapshot, 
  limit, 
  startAfter 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { decryptMessage } from '../firebase/encryptionService';

const ConversationSidebar = ({ 
  visible, 
  onClose, 
  onSelectConversation, 
  currentConversationId 
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser } = useAuth();
  const { colors } = useTheme();
  
  const CONVERSATIONS_PER_PAGE = 15;

  // Helper function to decrypt conversation titles
  const decryptConversationTitles = async (conversations) => {
    const decryptedConversations = [];
    for (const conversation of conversations) {
      const decryptedTitle = conversation.title ? await decryptMessage(conversation.title) : 'Yeni Konuşma';
      decryptedConversations.push({
        ...conversation,
        title: decryptedTitle
      });
    }
    return decryptedConversations;
  };

  // Load conversations when component mounts or user changes
  useEffect(() => {
    if (!visible || !currentUser) return;

    loadConversations();
  }, [visible, currentUser]);

  const loadConversations = async (isRefresh = false) => {
    if (!currentUser) return;

    setLoading(!isRefresh);
    if (isRefresh) setRefreshing(true);

    try {
      const q = query(
        collection(db, 'conversations'),
        where('userId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc'),
        limit(CONVERSATIONS_PER_PAGE)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastVisible(lastDoc);
        
        const conversationsList = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          }))
          .filter(conv => conv.messageCount > 0);

        // Decrypt conversation titles
        const decryptedConversations = await decryptConversationTitles(conversationsList);
        setConversations(decryptedConversations);
        setHasMore(querySnapshot.docs.length === CONVERSATIONS_PER_PAGE);
      } else {
        setConversations([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Hata', 'Konuşmalar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreConversations = async () => {
    if (!currentUser || !lastVisible || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      const q = query(
        collection(db, 'conversations'),
        where('userId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc'),
        startAfter(lastVisible),
        limit(CONVERSATIONS_PER_PAGE)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastVisible(lastDoc);
        
        const newConversations = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          }))
          .filter(conv => conv.messageCount > 0);
        
        const decryptedNewConversations = await decryptConversationTitles(newConversations);
        setConversations(prev => [...prev, ...decryptedNewConversations]);
        setHasMore(querySnapshot.docs.length === CONVERSATIONS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more conversations:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDeleteConversation = (conversationId) => {
    Alert.alert(
      'Konuşmayı Sil',
      'Bu konuşmayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => deleteConversation(conversationId)
        }
      ]
    );
  };

  const deleteConversation = async (conversationId) => {
    try {
      // First check if the conversation has messages
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      // Delete all messages in the conversation
      const batch = writeBatch(db);
      messagesSnapshot.forEach((messageDoc) => {
        batch.delete(doc(db, 'conversations', conversationId, 'messages', messageDoc.id));
      });
      
      // Execute the batch
      if (messagesSnapshot.size > 0) {
        await batch.commit();
      }
      
      // Now delete the conversation document
      await deleteDoc(doc(db, 'conversations', conversationId));
      
      // Update the local state to remove the deleted conversation
      setConversations(conversations.filter(conv => conv.id !== conversationId));
      
      // If the currently selected conversation is deleted, select a new one
      if (currentConversationId === conversationId) {
        if (conversations.length > 1) {
          const nextConversation = conversations.find(conv => conv.id !== conversationId);
          if (nextConversation) {
            onSelectConversation(nextConversation.id);
          }
        } else {
          onSelectConversation(null);
        }
      }
      
      Alert.alert('Başarılı', 'Konuşma başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      Alert.alert('Hata', 'Konuşmayı silerken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMs < 0 || diffInDays < 0) {
      return 'Bugün';
    }
    
    if (diffInDays === 0) {
      return 'Bugün';
    } else if (diffInDays === 1) {
      return 'Dün';
    } else if (diffInDays < 7) {
      return `${diffInDays} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', { 
        day: 'numeric', 
        month: 'short'
      });
    }
  };

  const handleSelectConversation = (conversationId) => {
    onSelectConversation(conversationId);
    onClose();
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        currentConversationId === item.id && styles.activeConversation
      ]}
      onPress={() => handleSelectConversation(item.id)}
    >
      <View style={styles.conversationInfo}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {item.title || 'Yeni Konuşma'}
        </Text>
        <Text style={styles.conversationDate}>
          {formatDate(item.updatedAt)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteConversation(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color="#E74C3C" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingMore}>
        <Text style={styles.loadingMoreText}>Daha fazla yükleniyor...</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.sidebarBackground || colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Konuşmalarım</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.newConversationButton, { backgroundColor: colors.activeBackground || colors.accent }]}
            onPress={() => handleSelectConversation(null)}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.newConversationText, { color: colors.primary }]}>Yeni Konuşma</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz konuşma bulunmuyor</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Yeni bir konuşma başlatmak için mesaj gönderin.
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversation}
              keyExtractor={(item) => item.id}
              style={styles.conversationsList}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={() => loadConversations(true)} 
                />
              }
              onEndReached={loadMoreConversations}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              showsVerticalScrollIndicator={false}
            />
          )}
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
    height: '85%',
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
  newConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E3F2FD',
    borderStyle: 'dashed',
  },
  newConversationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeConversation: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 5,
  },
  conversationDate: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 10,
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
});

export default ConversationSidebar; 