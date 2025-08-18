import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, writeBatch, onSnapshot, limit, startAfter } from 'firebase/firestore';
import { decryptMessage } from '../firebase/encryptionService';
import styles from './ConversationSidebar.module.css';

const ConversationSidebar = ({ onSelectConversation, currentConversationId, onClose }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const { currentUser } = useAuth();
    const sidebarRef = useRef(null);
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

    // Function to handle scroll events for infinite scrolling
    const handleScroll = () => {
        if (!sidebarRef.current || loadingMore || !hasMore) return;
        
        const { scrollTop, scrollHeight, clientHeight } = sidebarRef.current;
        // If scrolled to bottom (with a small threshold)
        if (scrollHeight - scrollTop - clientHeight < 50) {
            loadMoreConversations();
        }
    };

    // Initial load of conversations
    useEffect(() => {
        if (!currentUser) {
            setConversations([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        
        const q = query(
            collection(db, 'conversations'),
            where('userId', '==', currentUser.uid),
            orderBy('updatedAt', 'desc'),
            limit(CONVERSATIONS_PER_PAGE)
        );

        // Use onSnapshot for real-time updates
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
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
            setLoading(false);
        }, (error) => {
            console.error('Error fetching conversations:', error);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [currentUser]);

    // Set up scroll event listener
    useEffect(() => {
        const sidebar = sidebarRef.current;
        if (sidebar) {
            sidebar.addEventListener('scroll', handleScroll);
            return () => sidebar.removeEventListener('scroll', handleScroll);
        }
    }, [hasMore, loadingMore]);

    // Function to load more conversations
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
                // Set the last visible document for next pagination
                const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
                setLastVisible(lastDoc);
                
                const newConversations = querySnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        updatedAt: doc.data().updatedAt?.toDate() || new Date()
                    }))
                    .filter(conv => conv.messageCount > 0);
                
                // Decrypt conversation titles
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

    const handleDeleteConversation = async (e, conversationId) => {
        e.stopPropagation();
        if (!window.confirm('Bu konuşmayı silmek istediğinizden emin misiniz?')) {
            return;
        }

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
                    // Find the next conversation to select
                    const nextConversation = conversations.find(conv => conv.id !== conversationId);
                    if (nextConversation) {
                        onSelectConversation(nextConversation.id);
                    }
                } else {
                    // No more conversations, create a new one
                    onSelectConversation(null);
                }
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert('Konuşmayı silerken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    };

    const formatDate = (date) => {
        if (!date) return '';
        
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        // Handle negative differences (future dates due to server/client time sync issues)
        if (diffInMs < 0 || diffInDays < 0) {
            return 'Bugün'; // Treat future dates as "today" to avoid "-1 gün önce"
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

    if (!currentUser) {
        return null;
    }

    return (
        <div className={styles.sidebar} ref={sidebarRef}>
            <div className={styles.sidebarHeader}>
                <h3>Konuşmalarım</h3>
                <button 
                    className={styles.closeButton} 
                    onClick={onClose}
                    aria-label="Kapat"
                >
                    ×
                </button>
            </div>
            
            {loading ? (
                <div className={styles.loading}>Yükleniyor...</div>
            ) : conversations.length === 0 ? (
                <div className={styles.noConversations}>
                    <p>Henüz konuşma bulunmuyor.</p>
                    <p className={styles.startNewHint}>Yeni bir konuşma başlatmak için mesaj gönderin.</p>
                </div>
            ) : (
                <div className={styles.conversationList}>
                    {conversations.map(conversation => (
                        <div 
                            key={conversation.id} 
                            className={`${styles.conversationItem} ${currentConversationId === conversation.id ? styles.active : ''}`}
                            onClick={() => onSelectConversation(conversation.id)}
                        >
                            <div className={styles.conversationInfo}>
                                <div className={styles.title}>{conversation.title || 'Yeni Konuşma'}</div>
                                <div className={styles.date}>{formatDate(conversation.updatedAt)}</div>
                            </div>
                            <button 
                                className={styles.deleteButton}
                                onClick={(e) => handleDeleteConversation(e, conversation.id)}
                                aria-label="Konuşmayı Sil"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    
                    {loadingMore && (
                        <div className={styles.loadingMore}>Daha fazla yükleniyor...</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ConversationSidebar; 