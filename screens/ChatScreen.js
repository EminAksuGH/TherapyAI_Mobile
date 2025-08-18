import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useMemory } from '../context/MemoryContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { encryptMessage, decryptMessage } from '../firebase/encryptionService';
import { saveFeedback } from '../firebase/feedbackService';
import ConversationSidebar from '../components/ConversationSidebar';
import FeedbackModal from '../components/FeedbackModal';
import ProfileDropdown from '../components/ProfileDropdown';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  doc,
  setDoc,
  increment,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import axios from 'axios';

const ChatScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [profileDropdownVisible, setProfileDropdownVisible] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { currentUser } = useAuth();
  const { 
    memoryEnabled,
    toggleMemoryEnabled,
    createMemoryFromConversation,
    getFormattedMemories
  } = useMemory();
  const { theme, colors, toggleTheme, isDark } = useTheme();
  
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  // Create immersive chat experience with full-screen status bar
  useFocusEffect(
    React.useCallback(() => {
      // The StatusBar component below will handle the immersive experience
      // Native navigation bar hiding requires expo-dev-client (development build)
      // For now, we get more space with translucent status bar
      
      return () => {
        // Cleanup on unfocus
      };
    }, [])
  );

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [chatLog]);

  // Load the most recent conversation if available (but don't create one)
  useEffect(() => {
    if (currentUser && currentUser.emailVerified) {
      loadMostRecentConversation();
    }
  }, [currentUser]);

  // Load conversation messages when conversation ID changes
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Load conversation messages when conversation ID changes
  useEffect(() => {
    if (currentConversationId && currentUser) {
      loadConversationMessages();
    }
  }, [currentConversationId, currentUser]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Load the most recent conversation if available (matching web behavior)
  const loadMostRecentConversation = async () => {
    if (!currentUser) return;
    
    // Don't load any conversation at startup - just clear everything
    setCurrentConversationId(null);
    setChatLog([]);
    
    // No conversation will be loaded until the user explicitly selects one
    // or starts a new conversation by sending a message
  };

  // Load conversation messages from Firebase and decrypt them
  const loadConversationMessages = async (conversationId = currentConversationId) => {
    if (!conversationId || !currentUser) return;

    try {
      // Clear existing messages first
      setChatLog([]);
      
      // Query messages from the conversation's subcollection
      const messagesQuery = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("timestamp", "asc")
      );
      
      const querySnapshot = await getDocs(messagesQuery);
      const messages = [];

      // Process each message and decrypt it
      for (const doc of querySnapshot.docs) {
        const messageData = doc.data();
        try {
          // Decrypt the message text
          const decryptedText = await decryptMessage(messageData.text);
          
          messages.push({
            id: doc.id,
            text: decryptedText,
            isUser: messageData.sender === "user",
            timestamp: messageData.timestamp?.toDate() || new Date(),
          });
        } catch (decryptError) {
          console.error('Error decrypting message:', decryptError);
          // If decryption fails, keep the original text
          messages.push({
            id: doc.id,
            text: messageData.text,
            isUser: messageData.sender === "user", 
            timestamp: messageData.timestamp?.toDate() || new Date(),
          });
        }
      }

      // Set the decrypted messages to chatLog
      setChatLog(messages);
    } catch (error) {
      console.error("Error loading conversation messages:", error);
    }
  };

  // Handle selecting a conversation from the sidebar
  const handleSelectConversation = async (conversationId) => {
    if (conversationId === null) {
      // For new conversation, don't create it in the database yet
      // We'll only create it when the user sends their first message
      setCurrentConversationId(null);
      setChatLog([]);
    } else {
      // Load an existing conversation
      // Clear current chat log immediately to avoid showing wrong messages
      setChatLog([]);
      
      // Set the conversation ID - useEffect will handle loading messages
      setCurrentConversationId(conversationId);
    }
  };

  // Create a new conversation ID (matching web behavior)
  const createNewConversation = async () => {
    if (!currentUser) return null;
    
    try {
      // Encrypt conversation title
      let encryptedTitle;
      try {
        encryptedTitle = await encryptMessage("Yeni Konuşma");
      } catch (encryptionError) {
        console.error("Title encryption failed:", encryptionError);
        throw new Error("Şifreleme hatası - konuşma oluşturulamadı");
      }
      
      // Create a conversation document
      const conversationRef = await addDoc(collection(db, "conversations"), {
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        title: encryptedTitle,
        messageCount: 0
      });
      
      return conversationRef.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  };

  // Save message to Firebase (using subcollection structure like web app)
  const saveMessageToFirebase = async (messageData, providedConversationId = null) => {
    if (!currentUser) return null;
    
    try {
      // Ensure we have a conversation ID
      let conversationIdToUse = providedConversationId || currentConversationId;
      
      // Only create a new conversation if:
      // 1. We don't have a conversation ID AND
      // 2. This is a user message (not an AI response)
      if (!conversationIdToUse && messageData.sender === "user") {
        // Create a new conversation only when a user message is being sent
        const newConversationId = await createNewConversation();
        if (!newConversationId) {
          throw new Error("Failed to create conversation");
        }
        conversationIdToUse = newConversationId;
        setCurrentConversationId(newConversationId);
      } else if (!conversationIdToUse) {
        // This is an AI message but we don't have a conversation yet
        return null;
      }
      
      // Encrypt message before saving - CRITICAL: Do not save if encryption fails
      let encryptedMessage;
      try {
        encryptedMessage = await encryptMessage(messageData.text);
      } catch (encryptionError) {
        console.error("Encryption failed - message not saved for security:", encryptionError);
        throw new Error("Şifreleme hatası - güvenlik nedeniyle mesaj kaydedilemedi");
      }
      
      // Add message to conversation's messages subcollection
      await addDoc(collection(db, "conversations", conversationIdToUse, "messages"), {
        sender: messageData.sender,
        text: encryptedMessage,
        timestamp: serverTimestamp()
      });
      
      // Update conversation's 'updatedAt' field and increment message count
      await setDoc(doc(db, "conversations", conversationIdToUse), {
        updatedAt: serverTimestamp(),
        messageCount: increment(1)
      }, { merge: true });
      
      // Update conversation title if it's the first user message
      if (messageData.sender === "user") {
        const q = query(
          collection(db, "conversations", conversationIdToUse, "messages"),
          where("sender", "==", "user")
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.size === 1) {
          // This is the first user message, use it as the conversation title
          let title = messageData.text;
          if (title.length > 30) {
            title = title.substring(0, 30) + "...";
          }
          
          try {
            const encryptedTitle = await encryptMessage(title);
            await setDoc(doc(db, "conversations", conversationIdToUse), {
              title: encryptedTitle
            }, { merge: true });
          } catch (encryptionError) {
            console.error("Title encryption failed:", encryptionError);
            // Continue without setting title rather than failing the entire save
          }
        }
      }
      
      return conversationIdToUse;
    } catch (error) {
      console.error("Error saving message:", error);
      return null;
    }
  };

  // Start a new conversation by clearing the chat log
  const startNewConversation = () => {
    setChatLog([]);
    setCurrentConversationId(null);
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessageText = message.trim();
    setMessage('');

    const userMessage = {
      id: Date.now().toString(),
      text: userMessageText,
      isUser: true,
      timestamp: new Date(),
    };

    // Add user message to chat log
    setChatLog(prev => [...prev, userMessage]);
    setLoading(true);

    // Save user message to Firebase and store the returned conversation ID
    let activeConversationId = currentConversationId;
    if (!activeConversationId) {
      // If there's no conversation yet, saveMessageToFirebase will create one
      const newConversationId = await saveMessageToFirebase({ 
        sender: "user", 
        text: userMessageText 
      });
      if (newConversationId) {
        activeConversationId = newConversationId;
        setCurrentConversationId(newConversationId);
      }
    } else {
      // If we already have a conversation, just save the message
      await saveMessageToFirebase({ 
        sender: "user", 
        text: userMessageText 
      }, activeConversationId);
    }

    try {
      // Get conversation context (last few messages)
      const conversationContext = chatLog.slice(-4).map(msg => 
        `${msg.isUser ? 'User' : 'TherapyAI'}: ${msg.text}`
      ).join('\n');

      // Get relevant memories for AI context
      const memoryContext = await getFormattedMemories(userMessageText);

      // Check if this is an explicit memory save request
      const isExplicitSaveRequest = /(?:(?:remember|save|store|keep|hatırla|kaydet|sakla|tut) this|bunu (?:hatırla|kaydet|sakla|tut|aklında tut)|(?:bana|sana).+(?:hitap|böyle|şekilde).+istiyorum|(?:adım|ismim).+(?:bana|sana).+(?:hitap|çağır|de)|bundan böyle.+istiyorum)/i.test(userMessageText);

      // Prepare messages for OpenAI API (similar to web version)
      const messages = [
        {
          role: "system",
          content: `You are a virtual mental health assistant providing support and guidance for emotional well-being.

${memoryContext}

If the user asks about science, history, general knowledge, medicine, or anything clearly unrelated to emotional support (e.g., technical or factual questions), respond in the same language as the user with a gentle redirection.
If the user is writing in English, say:
"I'm here to help with emotional support and mental well-being. Let's focus on that together."

- If the user is writing in Turkish, say:
"Ben duygusal destek için buradayım. Bilgi sorularına yanıt veremem ama hislerini paylaşmak istersen seni dinlemeye hazırım."

MEMORY AUTHENTICITY:
- Only acknowledge remembering information that ACTUALLY exists in the memories provided above.
- If the user asks "Do you remember X?" and X is not mentioned in your memory data, you MUST truthfully state that you don't remember that information.
- When you don't remember something, DON'T change the subject or suggest talking about something else. Instead, say something like:
  * In Turkish: "Bunu hatırlamıyorum maalesef. Ama senin için önemli olan her şeyi konuşabiliriz. Bu konuda daha fazla paylaşmak istersen dinliyorum."
  * In English: "I don't recall that, unfortunately. But I'm here to talk about anything that's important to you. I'm listening if you'd like to share more about this."

MEMORY SAVING INSTRUCTIONS:
- If a user explicitly asks you to remember/save something (e.g., "remember this", "save this", "bunu hatırla", "bunu kaydet"), confirm with a clear acknowledgment:
  * When memory is ENABLED: "Bunu hafızama kaydettim. [brief confirmation of what was saved]" or "I've saved this to my memory: [brief confirmation]"
  * When memory is DISABLED: "Maalesef şu anda hafıza özelliğim devre dışı, bu yüzden bunu kaydedemiyorum. Ama konuşmaya devam edebiliriz." or "Sorry, my memory feature is currently disabled so I can't save this. But we can continue talking."

- Your primary role is to provide emotional support, reflective listening, and helpful advice.
- Always respond in Turkish since this is a Turkish therapy app.
- Encourage open communication, self-reflection, and positive coping strategies.
- Help the user feel heard, supported, and validated.`
        },
        {
          role: "user",
          content: userMessageText
        }
      ];

      // Call OpenAI API
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: messages,
          temperature: 0.9,
          max_tokens: 1500
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`
          }
        }
      );

      const aiResponseText = response.data.choices[0].message.content;

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: new Date(),
      };

      // Set loading to false before updating UI
      setLoading(false);
      
      // Add AI response to chat log
      setChatLog(prev => [...prev, aiMessage]);

      // Save AI response to Firebase
      if (activeConversationId) {
        await saveMessageToFirebase({ 
          sender: "ai", 
          text: aiResponseText 
        }, activeConversationId);
        
        // Create AI-analyzed memory from this interaction
        if (memoryEnabled) {
          try {
            // Get the last few messages as context
            const lastMessages = chatLog.slice(-3).map(msg => `${msg.isUser ? 'user' : 'ai'}: ${msg.text}`).join('\n');
            
            // Use AI to analyze and create memory with appropriate importance
            const result = await createMemoryFromConversation(
              userMessageText,
              lastMessages,
              activeConversationId
            );
            
            // Handle explicit save requests and memory limits like web version
            if (isExplicitSaveRequest) {
              const saveSuccessful = result && result.memoryId;
              
              if (!saveSuccessful && result && result.limitReached) {
                const limitMessage = { 
                  id: (Date.now() + 2).toString(),
                  text: `Maalesef hafıza limitine ulaştım. Yeni bilgileri kaydetmeden önce bazı eski konuları temizlemen gerekiyor.`,
                  isUser: false,
                  timestamp: new Date(),
                };
                
                setChatLog(prev => [...prev, limitMessage]);
                await saveMessageToFirebase({ 
                  sender: "ai", 
                  text: limitMessage.text 
                }, activeConversationId);
              }
            }
          } catch (memoryError) {
            console.error("Error creating memory:", memoryError);
            // Don't let memory errors affect the chat flow
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
      if (error.response?.status === 401) {
        errorMessage = 'API anahtarı geçersiz. Lütfen ayarları kontrol edin.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.';
      }
      
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
        isError: true
      };
      
      setChatLog(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  // Handle feedback button click
  const handleFeedbackClick = (aiMessage, userMessage) => {
    setSelectedFeedback({
      aiMessage: aiMessage.text,
      userMessage: userMessage?.text || ''
    });
    setFeedbackModalVisible(true);
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (feedbackData) => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    try {
      await saveFeedback(
        currentUser.uid,
        feedbackData.userMessage,
        feedbackData.aiMessage,
        feedbackData.reason,
        feedbackData.description
      );
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const renderMessage = ({ item, index }) => {
    const isLast = index === chatLog.length - 1;
    const userMessage = item.isUser === false && index > 0 ? chatLog[index - 1] : null;
    const dynamicStyles = styles(colors);
    
    return (
      <View style={[
        dynamicStyles.messageContainer, 
        item.isUser ? dynamicStyles.userMessage : dynamicStyles.aiMessage,
        item.isError && dynamicStyles.errorMessage
      ]}>
        <Text style={[
          dynamicStyles.messageText,
          item.isUser ? dynamicStyles.userMessageText : dynamicStyles.aiMessageText,
          item.isError && dynamicStyles.errorMessageText
        ]}>
          {item.text}
        </Text>
        <View style={dynamicStyles.messageFooter}>
          <Text style={[
            dynamicStyles.timestamp,
            item.isUser ? dynamicStyles.userTimestamp : dynamicStyles.aiTimestamp
          ]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.isUser === false && userMessage && !item.isError && (
            <TouchableOpacity 
              style={dynamicStyles.feedbackButton}
              onPress={() => handleFeedbackClick(item, userMessage)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Check if user is authenticated and email verified
  if (!currentUser) {
    const dynamicStyles = styles(colors);
    
    return (
      <View style={dynamicStyles.authRequiredContainer}>
        <Ionicons name="lock-closed-outline" size={80} color={colors.textSecondary} />
        <Text style={dynamicStyles.authRequiredTitle}>Giriş Gerekli</Text>
        <Text style={dynamicStyles.authRequiredText}>
          Terapi seansınız için lütfen giriş yapın.
        </Text>
        <TouchableOpacity 
          style={dynamicStyles.authButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={dynamicStyles.authButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentUser.emailVerified) {
    const dynamicStyles = styles(colors);
    
    return (
      <View style={dynamicStyles.authRequiredContainer}>
        <Ionicons name="mail-outline" size={80} color={colors.textSecondary} />
        <Text style={dynamicStyles.authRequiredTitle}>E-posta Doğrulaması</Text>
        <Text style={dynamicStyles.authRequiredText}>
          Terapi seansınız için lütfen e-posta adresinizi doğrulayın.
        </Text>
      </View>
    );
  }

    const dynamicStyles = styles(colors);
  
  return (
    <>
      {/* Immersive status bar for chat experience */}
      <StatusBar 
        style={isDark ? "light" : "dark"} 
        backgroundColor="transparent" 
        translucent={true}
      />
      
      <KeyboardAvoidingView 
        style={dynamicStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity 
          style={dynamicStyles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Ionicons name="menu-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <Text style={dynamicStyles.headerTitle}>TherapyAI</Text>
        
        <View style={dynamicStyles.headerControls}>
          <TouchableOpacity 
            style={[
              dynamicStyles.themeButton,
              { backgroundColor: colors.accent }
            ]}
            onPress={toggleTheme}
          >
            <Ionicons 
              name={isDark ? "sunny-outline" : "moon-outline"} 
              size={20} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              dynamicStyles.memoryButton,
              { backgroundColor: memoryEnabled ? colors.accent : colors.background }
            ]}
            onPress={toggleMemoryEnabled}
          >
            <Ionicons 
              name="library-outline" 
              size={20} 
              color={memoryEnabled ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {(currentConversationId !== null) && chatLog.length > 0 && (
            <TouchableOpacity 
              style={[dynamicStyles.newChatButton, { backgroundColor: colors.accent }]}
              onPress={startNewConversation}
            >
              <Ionicons name="add-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[dynamicStyles.profileButton, { backgroundColor: colors.accent }]}
            onPress={() => setProfileDropdownVisible(true)}
          >
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={dynamicStyles.contentContainer}>
        {/* Chat Area */}
        <View style={dynamicStyles.chatArea}>
          {chatLog.length > 0 ? (
            <FlatList
              ref={messagesEndRef}
              data={chatLog}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={dynamicStyles.chatList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={dynamicStyles.chatContent}
            />
          ) : (
            <View style={dynamicStyles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={80} color={colors.textSecondary} />
              <Text style={[dynamicStyles.emptyChatTitle, { color: colors.text }]}>TherapyAI'ya Hoş Geldiniz</Text>
              <Text style={[dynamicStyles.emptyChatSubtitle, { color: colors.textSecondary }]}>
                Duygusal destek ve zihinsel iyi oluş konusunda size yardımcı olmak için buradayım.
              </Text>
              <Text style={[dynamicStyles.emptyChatSubtitle, { color: colors.textSecondary }]}>
                Konuşmaya başlamak için bir mesaj gönderin veya önceki bir konuşmayı seçin.
              </Text>
            </View>
          )}

          {loading && (
            <View style={dynamicStyles.loadingContainer}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.primary} />
              <Text style={[dynamicStyles.loadingText, { color: colors.textSecondary }]}>TherapyAI düşünüyor...</Text>
            </View>
          )}
        </View>

        {/* Input Container - Fixed at bottom */}
        <View style={dynamicStyles.inputContainer}>
          <TextInput
            style={dynamicStyles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity 
            style={[dynamicStyles.sendButton, (!message.trim() || loading) && dynamicStyles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!message.trim() || loading}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversation Sidebar */}
      <ConversationSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onSelectConversation={handleSelectConversation}
        currentConversationId={currentConversationId}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        onSubmit={handleFeedbackSubmit}
        aiMessage={selectedFeedback?.aiMessage}
        userMessage={selectedFeedback?.userMessage}
      />

      {/* Profile Dropdown */}
      <ProfileDropdown
        visible={profileDropdownVisible}
        onClose={() => setProfileDropdownVisible(false)}
        navigation={navigation}
      />
    </KeyboardAvoidingView>
    </>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Account for translucent status bar
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  authRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  authRequiredText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  authButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  chatArea: {
    flex: 1,
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexGrow: 1,
  },
  themeButton: {
    padding: 8,
    borderRadius: 15,
  },
  memoryButton: {
    padding: 8,
    borderRadius: 15,
  },
  newChatButton: {
    padding: 8,
    borderRadius: 15,
  },
  profileButton: {
    padding: 8,
    borderRadius: 15,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyChatTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyChatSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.userMessage,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.aiMessage,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorMessage: {
    backgroundColor: colors.error + '20', // Adding transparency
    borderColor: colors.error + '40',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: colors.text,
  },
  errorMessageText: {
    color: colors.error,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
  userTimestamp: {
    color: 'white',
  },
  aiTimestamp: {
    color: '#7F8C8D',
  },
  feedbackButton: {
    padding: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  loadingText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 10,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatScreen; 