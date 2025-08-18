import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import * as memoryService from '../firebase/memoryService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const MemoryContext = createContext();

export function useMemory() {
  return useContext(MemoryContext);
}

export function MemoryProvider({ children }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [recentMemories, setRecentMemories] = useState([]);
  const [importantMemories, setImportantMemories] = useState([]);
  const [userTopics, setUserTopics] = useState([]);
  const [topicCount, setTopicCount] = useState(0);
  
  const MAX_TOPICS = 20;

  useEffect(() => {
    async function initializeMemory() {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Don't try to initialize memory until email is verified
        if (!currentUser.emailVerified) {
  
          setLoading(false);
          return;
        }
        
        // Ensure user profile exists
        await memoryService.ensureUserProfile(currentUser.uid);
        
        // Update user activity timestamp
        await memoryService.updateUserActivity(currentUser.uid);
        
        // Get user preferences including memoryEnabled
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().preferences) {
          setMemoryEnabled(userSnap.data().preferences.memoryEnabled !== false);
        }
        
        // Only load memory data if memory is enabled
        if (memoryEnabled) {
          // Load recent memories
          const recent = await memoryService.getRecentMemories(currentUser.uid);
          setRecentMemories(recent);
          
          // Load important memories
          const important = await memoryService.getImportantMemories(currentUser.uid);
          setImportantMemories(important);
          
          // Load user topics
          const topics = await memoryService.getUserTopics(currentUser.uid);
          setUserTopics(topics);
          setTopicCount(topics.length);
        } else {
          // Keep arrays empty when memory is disabled
          setRecentMemories([]);
          setImportantMemories([]);
          setUserTopics([]);
          setTopicCount(0);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing memory:", error);
        
        // Special handling for permission errors - likely due to email not verified
        if (error.code === 'permission-denied') {
  
        }
        
        // If there's an error, ensure memory arrays are empty
        setRecentMemories([]);
        setImportantMemories([]);
        setUserTopics([]);
        setTopicCount(0);
        setLoading(false);
      }
    }

    initializeMemory();
  }, [currentUser, memoryEnabled]);

  // Create a new memory
  const createMemory = async (topic, content, conversationId, importance = 5) => {
    if (!currentUser) return null;
    
    try {
      const memoryId = await memoryService.createMemory(
        currentUser.uid,
        topic,
        content,
        conversationId,
        importance
      );
      
      // Refresh recent memories
      const recent = await memoryService.getRecentMemories(currentUser.uid);
      setRecentMemories(recent);
      
      return memoryId;
    } catch (error) {
      console.error("Error creating memory:", error);
      return null;
    }
  };

  // Delete a memory
  const deleteMemory = async (memoryId) => {
    if (!currentUser) return false;
    
    try {
      // Delete the memory
      await memoryService.deleteMemory(currentUser.uid, memoryId);
      
      // Refresh memory lists
      const recent = await memoryService.getRecentMemories(currentUser.uid);
      setRecentMemories(recent);
      
      const important = await memoryService.getImportantMemories(currentUser.uid);
      setImportantMemories(important);
      
      // Refresh topics list
      const topics = await memoryService.getUserTopics(currentUser.uid);
      setUserTopics(topics);
      setTopicCount(topics.length);
      
      return true;
    } catch (error) {
      console.error("Error deleting memory:", error);
      return false;
    }
  };
  
  // Check if a new topic can be added
  const canAddNewTopic = (topic) => {
    if (!topic) return false;
    
    // If the topic already exists, we're not adding a new one
    if (userTopics.includes(topic)) return true;
    
    // If we're under the limit, we can add a new topic
    return topicCount < MAX_TOPICS;
  };

  // AI-driven memory creation from conversation
  const createMemoryFromConversation = async (userMessage, conversationContext, conversationId) => {
    if (!currentUser || !memoryEnabled) return null;
    
    try {
      // Get existing memories to check for duplicates
      const existingMemories = [...recentMemories, ...importantMemories];
      
      // Check for explicit save request in the user message
      const isExplicitSaveRequest = /(?:(?:remember|save|store|keep|hatırla|kaydet|sakla|tut) this|bunu (?:hatırla|kaydet|sakla|tut|aklında tut))/i.test(userMessage.trim());
      
      // Use AI to analyze the conversation and determine importance
      const analysis = await memoryService.analyzeMemoryImportance(
        userMessage, 
        conversationContext,
        existingMemories
      );
      
      // If the user explicitly requested to save this information
      if (isExplicitSaveRequest) {
        // Check topic limits - a critical constraint even for explicit requests
        const primaryTopic = analysis.topics[0] || "User Requested Memory";
        
        // If we've hit topic limits and this is a new topic
        if (!canAddNewTopic(primaryTopic)) {
          // Return a special response indicating memory limit reached
          return {
            memoryId: null,
            analysis,
            limitReached: true,
            limitType: "topic",
            message: "Memory topic limit reached. Please delete some existing topics before saving new ones."
          };
        }

        // For explicit requests, we'll always save and set minimum importance to 6
        analysis.shouldStore = true;
        // Ensure explicit save requests have at least 6/10 importance
        if (analysis.importance < 6) {
          analysis.importance = 6;
        }
      } else {
        // For normal messages, use consistent 6/10 importance threshold
        const MINIMUM_IMPORTANCE = 6;
        
        // Only create memory if it's important enough and AI determines it's worth storing
        if (!analysis.shouldStore || analysis.importance < MINIMUM_IMPORTANCE) {
          return null;
        }
      }
      
      // Check if we can add this topic (if it's new)
      const primaryTopic = analysis.topics[0];
      if (!canAddNewTopic(primaryTopic)) {
        // If we can't add a new topic, use a generic one
        analysis.topics[0] = "General Memory";
      }
      
      // Create the memory with the AI-determined importance
      const memoryId = await memoryService.createMemory(
        currentUser.uid,
        analysis.topics[0], // Use the first topic as the primary topic
        analysis.extractedMemory,
        conversationId,
        analysis.importance,
        analysis.reasoning  // Include the reasoning for this memory's importance
      );
      
      // Add the other topics as interests if they exist
      if (analysis.topics.length > 1) {
        for (let i = 1; i < analysis.topics.length; i++) {
          const topic = analysis.topics[i];
          // Only add if we're not at the limit or if the topic already exists
          if (canAddNewTopic(topic)) {
            await memoryService.addUserInterest(currentUser.uid, topic);
          }
        }
      }
      
      // Refresh recent memories
      const recent = await memoryService.getRecentMemories(currentUser.uid);
      setRecentMemories(recent);
      
      // Also refresh important memories if this one is important
      if (analysis.importance >= 7) {
        const important = await memoryService.getImportantMemories(currentUser.uid);
        setImportantMemories(important);
      }
      
      // Refresh topics
      const topics = await memoryService.getUserTopics(currentUser.uid);
      setUserTopics(topics);
      setTopicCount(topics.length);
      
      return {
        memoryId,
        analysis
      };
    } catch (error) {
      console.error("Error creating AI-analyzed memory:", error);
      return null;
    }
  };

  // Search for memories based on keywords
  const searchMemories = async (query) => {
    if (!currentUser) return [];
    
    try {
      return await memoryService.searchMemories(currentUser.uid, query);
    } catch (error) {
      console.error("Error searching memories:", error);
      return [];
    }
  };

  // Get memories by topic
  const getMemoriesByTopic = async (topic) => {
    if (!currentUser) return [];
    
    try {
      return await memoryService.getMemoriesByTopic(currentUser.uid, topic);
    } catch (error) {
      console.error("Error getting memories by topic:", error);
      return [];
    }
  };

  // Format memories for AI context
  const getFormattedMemories = async (searchQuery = null) => {
    if (!currentUser || !memoryEnabled) return "";
    
    try {
      let memories;
      
      if (searchQuery) {
        // Use smart Firebase search to find relevant memories
        memories = await memoryService.smartSearchMemories(currentUser.uid, searchQuery);
      } else {
        // Use important memories if no search query
        memories = importantMemories;
      }
      
      return memoryService.formatMemoriesForContext(memories);
    } catch (error) {
      console.error("Error formatting memories:", error);
      return "";
    }
  };

  // Toggle memory feature enabled/disabled
  const toggleMemoryEnabled = async () => {
    if (!currentUser) return;

    const newMemoryEnabled = !memoryEnabled;
    setMemoryEnabled(newMemoryEnabled);
    
    try {
      // Update preference in Firebase
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        "preferences.memoryEnabled": newMemoryEnabled
      });
      
      // If disabling memory, clear the display (but not the storage)
      if (!newMemoryEnabled) {
        setRecentMemories([]);
        setImportantMemories([]);
      } else {
        // If enabling, refresh memory lists
        const recent = await memoryService.getRecentMemories(currentUser.uid);
        setRecentMemories(recent);
        
        const important = await memoryService.getImportantMemories(currentUser.uid);
        setImportantMemories(important);
        
        const topics = await memoryService.getUserTopics(currentUser.uid);
        setUserTopics(topics);
        setTopicCount(topics.length);
      }
    } catch (error) {
      console.error("Error updating memory preference:", error);
      // Revert back if failed
      setMemoryEnabled(!newMemoryEnabled);
    }
  };

  // Clean up low importance memories
  const cleanupLowImportanceMemories = async (importanceThreshold = 5) => {
    if (!currentUser) return 0;
    
    try {
      const deletedCount = await memoryService.deleteLowImportanceMemories(
        currentUser.uid, 
        importanceThreshold
      );
      
      // Refresh memory lists
      const recent = await memoryService.getRecentMemories(currentUser.uid);
      setRecentMemories(recent);
      
      const important = await memoryService.getImportantMemories(currentUser.uid);
      setImportantMemories(important);
      
      // Refresh topics
      const topics = await memoryService.getUserTopics(currentUser.uid);
      setUserTopics(topics);
      setTopicCount(topics.length);
      
      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up memories:", error);
      return 0;
    }
  };

  const value = {
    loading,
    memoryEnabled,
    toggleMemoryEnabled,
    recentMemories,
    importantMemories,
    userTopics,
    topicCount,
    MAX_TOPICS,
    createMemory,
    deleteMemory,
    createMemoryFromConversation,
    searchMemories,
    getMemoriesByTopic,
    getFormattedMemories,
    cleanupLowImportanceMemories
  };

  return (
    <MemoryContext.Provider value={value}>
      {children}
    </MemoryContext.Provider>
  );
} 