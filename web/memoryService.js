import { 
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    updateDoc,
    arrayUnion,
    increment,
    deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import axios from "axios";
import { encryptMemoryContent, decryptMemoryContent } from "./encryptionService";

// Maximum number of memories to retrieve for context
const MAX_MEMORIES = 5;

/**
 * Capitalize the first letter of each word in a Turkish phrase correctly
 * @param {string} text - The text to capitalize
 */
const capitalizeTurkish = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    return text.split(' ').map(word => {
        if (!word) return word;
        
        const firstChar = word.charAt(0);
        const restOfWord = word.slice(1);
        
        // Handle Turkish-specific capitalization for i and ı, otherwise use standard capitalization
        const capitalizedFirstChar = firstChar === 'i' ? 'İ' : 
                                     firstChar === 'ı' ? 'I' : 
                                     firstChar.toUpperCase();
        
        return capitalizedFirstChar + restOfWord;
    }).join(' ');
};

/**
 * Store a new memory for a user
 * @param {string} userId - The user ID
 * @param {string} topic - The topic/category of the memory
 * @param {string} content - The content of the memory
 * @param {string} conversationId - Associated conversation ID
 * @param {number} importance - Importance score (1-10)
 * @param {string} reasoning - Optional reasoning for the memory's importance
 */
export const createMemory = async (userId, topic, content, conversationId, importance = 5, reasoning = null) => {
    try {
        // Create a unique ID for the memory
        const memoryRef = doc(collection(db, "users", userId, "memories"));
        
        const memoryData = {
            topic: capitalizeTurkish(topic), // Capitalize the topic with Turkish-specific rules
            content: await encryptMemoryContent(content), // Encrypt memory content before saving
            conversationId,
            importance,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            recallCount: 0
        };
        
        // Add reasoning if available
        if (reasoning) {
            memoryData.reasoning = reasoning;
        }
        
        await setDoc(memoryRef, memoryData);
        
        return memoryRef.id;
    } catch (error) {
        console.error("Error creating memory:", error);
        throw error;
    }
};

/**
 * Update an existing memory
 * @param {string} userId - The user ID
 * @param {string} memoryId - The memory ID to update
 * @param {object} updates - Fields to update
 */
export const updateMemory = async (userId, memoryId, updates) => {
    try {
        const memoryRef = doc(db, "users", userId, "memories", memoryId);
        
        // Add updatedAt timestamp to updates
        const updatesWithTimestamp = {
            ...updates,
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(memoryRef, updatesWithTimestamp);
        return true;
    } catch (error) {
        console.error("Error updating memory:", error);
        throw error;
    }
};

/**
 * Increment the recall count for a memory
 * @param {string} userId - The user ID
 * @param {string} memoryId - The memory ID
 */
export const incrementRecallCount = async (userId, memoryId) => {
    try {
        const memoryRef = doc(db, "users", userId, "memories", memoryId);
        await updateDoc(memoryRef, {
            recallCount: increment(1),
            lastRecalled: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error incrementing recall count:", error);
        throw error;
    }
};

/**
 * Get specific memory by ID
 * @param {string} userId - The user ID
 * @param {string} memoryId - The memory ID
 */
export const getMemory = async (userId, memoryId) => {
    try {
        const memoryRef = doc(db, "users", userId, "memories", memoryId);
        const memorySnap = await getDoc(memoryRef);
        
        if (memorySnap.exists()) {
            const data = memorySnap.data();
            return { 
                id: memorySnap.id, 
                ...data,
                content: await decryptMemoryContent(data.content) // Decrypt memory content after fetching
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error getting memory:", error);
        throw error;
    }
};

/**
 * Get memories for a specific topic
 * @param {string} userId - The user ID
 * @param {string} topic - The topic to search for
 * @param {number} limit - Maximum number of memories to retrieve
 */
export const getMemoriesByTopic = async (userId, topic, maxResults = MAX_MEMORIES) => {
    try {
        const memoriesRef = collection(db, "users", userId, "memories");
        const q = query(
            memoriesRef,
            where("topic", "==", topic),
            orderBy("importance", "desc"),
            limit(maxResults)
        );
        
        const querySnapshot = await getDocs(q);
        const memories = [];
        
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            memories.push({ 
                id: doc.id, 
                ...data,
                content: await decryptMemoryContent(data.content) // Decrypt memory content after fetching
            });
        }
        
        return memories;
    } catch (error) {
        console.error("Error getting memories by topic:", error);
        throw error;
    }
};

/**
 * Get the most important memories for a user
 * @param {string} userId - The user ID
 * @param {number} maxResults - Maximum number of memories to retrieve
 */
export const getImportantMemories = async (userId, maxResults = MAX_MEMORIES) => {
    try {
        const memoriesRef = collection(db, "users", userId, "memories");
        const q = query(
            memoriesRef,
            orderBy("importance", "desc"),
            limit(maxResults)
        );
        
        const querySnapshot = await getDocs(q);
        const memories = [];
        
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            memories.push({ 
                id: doc.id, 
                ...data,
                content: await decryptMemoryContent(data.content) // Decrypt memory content after fetching
            });
        }
        
        return memories;
    } catch (error) {
        console.error("Error getting important memories:", error);
        throw error;
    }
};

/**
 * Get most recently created memories
 * @param {string} userId - The user ID
 * @param {number} maxResults - Maximum number of memories to retrieve
 */
export const getRecentMemories = async (userId, maxResults = MAX_MEMORIES) => {
    try {
        const memoriesRef = collection(db, "users", userId, "memories");
        const q = query(
            memoriesRef,
            orderBy("createdAt", "desc"),
            limit(maxResults)
        );
        
        const querySnapshot = await getDocs(q);
        const memories = [];
        
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            memories.push({ 
                id: doc.id, 
                ...data,
                content: await decryptMemoryContent(data.content) // Decrypt memory content after fetching
            });
        }
        
        return memories;
    } catch (error) {
        console.error("Error getting recent memories:", error);
        throw error;
    }
};

/**
 * Search for memories matching keywords
 * This is a simple implementation - for advanced search consider using
 * Firestore's text search capabilities or a dedicated search service
 * @param {string} userId - The user ID
 * @param {string} query - The search query
 */
export const searchMemories = async (userId, searchQuery) => {
    try {
        // Get all memories and filter client-side
        // Note: For production apps with many memories, consider using
        // a proper search solution like Algolia or Elastic Search
        const memoriesRef = collection(db, "users", userId, "memories");
        const querySnapshot = await getDocs(memoriesRef);
        
        const memories = [];
        const searchTerms = searchQuery.toLowerCase().split(' ');
        
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const decryptedContent = await decryptMemoryContent(data.content); // Decrypt for search
            const content = (decryptedContent || '').toLowerCase();
            const topic = (data.topic || '').toLowerCase();
            
            // Check if any of the search terms are in the content or topic
            const matchesSearch = searchTerms.some(term => 
                content.includes(term) || topic.includes(term)
            );
            
            if (matchesSearch) {
                memories.push({ 
                    id: doc.id, 
                    ...data,
                    content: decryptedContent // Use already decrypted content
                });
            }
        }
        
        // Sort by importance
        memories.sort((a, b) => b.importance - a.importance);
        
        return memories.slice(0, MAX_MEMORIES);
    } catch (error) {
        console.error("Error searching memories:", error);
        throw error;
    }
};

/**
 * Create a user profile document if it doesn't exist
 * @param {string} userId - The user ID
 */
export const ensureUserProfile = async (userId) => {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                preferences: {
                    memoryEnabled: true
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error("Error ensuring user profile:", error);
        throw error;
    }
};

/**
 * Update user's lastActive timestamp
 * @param {string} userId - The user ID
 */
export const updateUserActivity = async (userId) => {
    try {
        if (!userId) return false;
        
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            lastActive: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error("Error updating user activity:", error);
        // Create the user profile if it doesn't exist
        try {
            await ensureUserProfile(userId);
            return true;
        } catch (innerError) {
            console.error("Error creating user profile:", innerError);
            return false;
        }
    }
};

/**
 * Add a topic to the user's interests
 * @param {string} userId - The user ID
 * @param {string} topic - The topic to add
 */
export const addUserInterest = async (userId, topic) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            interests: arrayUnion(topic),
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error adding user interest:", error);
        throw error;
    }
};

/**
 * Get all topics for a user from their interests array and memory topics
 * @param {string} userId - The user ID
 * @returns {Promise<Array<string>>} - Array of unique topics
 */
export const getUserTopics = async (userId) => {
    try {
        // Get user's interests
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        let topics = [];
        
        if (userSnap.exists() && userSnap.data().interests) {
            topics = [...userSnap.data().interests];
        }
        
        // Get unique topics from memories
        const memoriesRef = collection(db, "users", userId, "memories");
        const querySnapshot = await getDocs(memoriesRef);
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.topic && !topics.includes(data.topic)) {
                topics.push(data.topic);
            }
        });
        
        return topics;
    } catch (error) {
        console.error("Error getting user topics:", error);
        throw error;
    }
};

/**
 * Format memories for inclusion in AI context
 * @param {Array} memories - Array of memory objects
 * @returns {string} - Formatted string of memories
 */
export const formatMemoriesForContext = (memories) => {
    if (!memories || memories.length === 0) {
        return `No previous memories available for this user.

IMPORTANT INSTRUCTIONS FOR MEMORY HANDLING:
1. You do NOT have any stored memories about this user. If the user asks if you remember something specific, you MUST truthfully respond that you don't recall that information.
2. If the user asks "Do you remember [anything]?" respond with some variation of "Bunu hatırlamıyorum maalesef. Ama bu konu senin için önemliyse, seni dinlemeye hazırım." (in Turkish) or "I don't have a memory of that, but if it's important to you, I'm here to listen" (in English).
3. Never pretend to remember details that aren't explicitly provided to you.
4. After acknowledging you don't remember, express willingness to discuss the topic anyway if it matters to the user. Don't change the subject or redirect to general feelings.
5. Avoid phrases like "let's talk about something else" or "başka bir konuda konuşalım" as these invalidate the user's choice of topic.
6. Instead, use phrases like "Ama senin için önemli olan her şeyi konuşabiliriz" or "I'm here to listen if you'd like to tell me about it."`;
    }
    
    return `User's previous memories:
${memories.map((memory, index) => 
    `Memory ${index+1} [Topic: ${memory.topic}]: ${memory.content} (Importance: ${memory.importance}/10)`
).join('\n')}

IMPORTANT INSTRUCTIONS FOR MEMORY USE:
1. ONLY acknowledge remembering information that EXPLICITLY appears in the memories listed above. If something is not mentioned in these specific memories, you MUST say you don't recall that information.
2. If the user asks "Do you remember X?" and X is NOT mentioned in the memories above, respond with "Bunu hatırlamıyorum maalesef. Ama senin için önemliyse, bu konuda konuşmaya hazırım." (in Turkish) or "I don't recall that, but if it's important to you, I'm ready to talk about it" (in English).
3. Reference relevant memories ONLY when they actually appear above.
4. You can refer to these memories as things the user "mentioned previously" or "talked about before."
5. Use this context to provide personalized support, but don't mention the memory system explicitly.
6. CRITICAL: If memories contain non-therapeutic topics (e.g., cars, products, technical information), acknowledge that you remember the user mentioned these interests, but DO NOT provide factual information, recommendations, or advice on these topics. Always redirect to emotional support instead.
7. Even when using a friendly tone or when the user uses expressions like "kanka", never provide information or advice on topics outside your therapeutic scope, regardless of what appears in memories.
8. Never invent or pretend to remember details that aren't in the memories above.
9. When you don't remember something, be humble but still offer to discuss the topic itself. Don't change the subject or redirect away from what the user wanted to discuss.`;
};

/**
 * Use AI to analyze conversation content and determine memory importance
 * @param {string} conversationText - The text to analyze
 * @param {string} previousContext - Previous context or messages for reference
 * @param {Array} existingMemories - Existing user memories to check for duplicates
 * @returns {Promise<object>} - Analysis results including importance and extractedMemory
 */
export const analyzeMemoryImportance = async (conversationText, previousContext = "", existingMemories = []) => {
    try {
        // Check if this is a meta-query about memory itself without additional context
        const isGenericMemoryQuery = /^(?:do you (?:remember|know|recall)|(?:hatırlıyor|biliyor) mu(?:sun)?).*?$/i.test(conversationText.trim());
        
        // Check if user is explicitly asking to remember/save something
        const isExplicitSaveRequest = /(?:(?:remember|save|store|keep|hatırla|kaydet|sakla|tut) this|bunu (?:hatırla|kaydet|sakla|tut|aklında tut)|(?:bana|sana).+(?:hitap|böyle|şekilde).+istiyorum|(?:adım|ismim).+(?:bana|sana).+(?:hitap|çağır|de)|bundan böyle.+istiyorum)/i.test(conversationText.trim());
        
        // If user explicitly asks to remember something, we'll prioritize storing it
        if (isExplicitSaveRequest) {
            // Extract what they want to remember
            const extractedContent = conversationText
                .replace(/(?:(?:can you |please |lütfen |)?(?:remember|save|store|keep|hatırla|kaydet|sakla|tut) this|bunu (?:hatırla|kaydet|sakla|tut|aklında tut))(?:\s*:\s*|\s+)/i, '')
                .trim();
            
            return {
                importance: 6, // Set medium-high importance by default for explicit requests
                extractedMemory: extractedContent || conversationText,
                topics: ["Kullanıcı Talebi"], // "User Request" in Turkish
                reasoning: "Kullanıcı bu bilgiyi kaydetmek için özel olarak talepte bulundu",
                shouldStore: true // Always store user-requested memories
            };
        }
        
        // Check for low-value content
        const isLowValueContent = 
            conversationText.length < 15 || 
            /^(ok|tamam|merhaba|selam|hi|hello|hey|thanks|teşekkür)$/i.test(conversationText.trim());
        
        if (isGenericMemoryQuery || isLowValueContent) {
            // Perform a simple content check for memory queries
            // If the query contains a name or specific topic, it could still be valuable
            const containsSpecificContent = /\b[A-Z][a-z]{2,}\b|\b(?!do|you|remember|know|recall|hatırlıyor|musun|mu|biliyor)[a-zA-Z]{5,}\b/i.test(conversationText);
            
            if (!containsSpecificContent) {
                return {
                    importance: 2,
                    extractedMemory: conversationText.substring(0, 100),
                    topics: ["Sohbet"],
                    reasoning: "Genel sorgu veya önemli kişisel içerik içermeyen basit selamlama",
                    shouldStore: false
                };
            }
        }
        
        // Use the API key from environment variables
        const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
        
        // Call OpenAI API to analyze the conversation
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `You are an AI that analyzes conversations to determine what information might be important to remember for future interactions.
                        
Instructions:
1. Analyze the given message and extract any potentially important information about the user
2. Assign an importance score (1-10) based on how critical this information would be for future interactions
3. Create a concise memory statement summarizing the important information IN TURKISH (since this is a Turkish therapy app)
4. Determine appropriate topics/tags for categorizing this memory IN TURKISH

For importance scoring - USE THE FULL RANGE (1-10) based on actual content, but be conservative:
- 1-3: Very casual remarks, routine information, simple questions or basic preferences
- 4-5: Noteworthy information, moderate emotional content, recurring interests
- 6-7: Significant personal information, important relationships, notable events
- 8-10: Critical information (major life events, trauma, crucial needs, deep emotional content)

Be conservative with scoring - memories should be meaningful:
- Default to lower scores (1-5) unless content is truly significant
- Reserve scores of 6+ for genuinely important emotional or personal content
- Casual memory checks (like "do you remember X?") without emotional depth should be 2-3
- Basic biographical information without emotional context should be 3-4
- New user preferences or interests without emotional significance should be 4-5
- Only conversations with real emotional depth, important relationships, or significant life events should reach 6+

Focus especially on:
- Personal relationships (with appropriate score based on significance)
- Names and how the user wants to be addressed (CRITICAL - score 7+)
- Emotional states or patterns
- Life events (minor to major)
- Expressed needs or challenges
- Recurring themes or concerns
- Cultural context or background
- User preferences for interaction style

IMPORTANT: Since this is a Turkish therapy application:
- Write all memory content (extractedMemory) in TURKISH
- Use Turkish topic names (e.g., "isim" instead of "name", "tercihler" instead of "preferences")
- Keep the natural flow of Turkish language in memory descriptions

Do not extract or remember:
- Simple greetings or short exchanges without substance
- Specific passwords or security information
- Private identifiable information that isn't relevant for emotional support
- Information that is already captured in existing memories
- Each message doesn't necessarily need to create a new memory
- Generic memory queries like "do you remember?" without specific content
- Questions that are just checking if AI remembers something
- Factual queries unrelated to emotional support (score appropriately if they must be remembered)

About memory-related queries:
- If a query like "Do you remember X?" contains important personal information (like names, relationships, events), DO extract the actual information about X
- Rate the importance based on the content being asked about, not the fact that it's a memory query
- Assign appropriate scores to memory queries based on their actual content value
- If a memory query reveals new information about the user's life or relationships, assign a score that matches its true significance

Special attention to names and addressing:
- When a user shares their name (e.g., "Benim adım X" / "My name is X"), this should be scored 7+ as it's critical for personalization
- When a user requests specific addressing (e.g., "Bana X olarak hitap et" / "Address me as X"), this should be scored 7+ 
- Turkish phrases like "bundan böyle", "istiyorum", "hitap et" often indicate important preferences
- Names and addressing preferences are fundamental to building rapport and should always be remembered
- For names: write in Turkish like "Kullanıcının adı X" instead of "User's name is X"
- For addressing preferences: write in Turkish like "X adıyla hitap edilmek istiyor" instead of "Prefers to be addressed as X"

Output JSON only with the following structure:
{
  "importance": number, // 1-10, using the full scale but be conservative
  "extractedMemory": string, // Concise memory statement IN TURKISH
  "topics": string[], // 1-3 relevant topic tags IN TURKISH
  "reasoning": string, // Brief explanation of why this information matters and justification for the importance score IN TURKISH
  "shouldStore": boolean // Whether this is worth storing as a new memory, default to false for importance < 6
}`
                    },
                    {
                        role: "user",
                        content: `Previous context (if any):
${previousContext}

User's message:
${conversationText}

Existing user memories:
${existingMemories.map(m => `[${m.topic}]: ${m.content}`).join('\n')}

Analyze this message and determine what should be remembered. Consider if this information is already captured in existing memories. Return valid JSON only.`
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${API_KEY}`
                }
            }
        );

        if (!response.data || !response.data.choices || response.data.choices.length === 0) {
            throw new Error("Invalid API response");
        }

        // Parse the AI response to extract the JSON
        const aiResponse = response.data.choices[0].message.content;
        
        // Extract the JSON data from the response
        let jsonData;
        try {
            // Try to parse the entire response as JSON
            jsonData = JSON.parse(aiResponse);
        } catch (e) {
            // If that fails, try to extract JSON from the text
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonData = JSON.parse(jsonMatch[0]);
            } else {
                // Fallback values if parsing fails
                jsonData = {
                    importance: 5,
                    extractedMemory: conversationText.substring(0, 100),
                    topics: ["Sohbet"],
                    reasoning: "Varsayılan hafıza oluşturma",
                    shouldStore: existingMemories.length === 0 // Only store if no memories exist
                };
            }
        }
        
        // Capitalize topics with Turkish-specific rules
        if (jsonData.topics && Array.isArray(jsonData.topics)) {
            jsonData.topics = jsonData.topics.map(topic => capitalizeTurkish(topic));
        }
        
        // Set default for shouldStore if it's not present
        if (jsonData.shouldStore === undefined) {
            // Use a more flexible approach - consider storing lower importance memories
            // that might still be valuable for context, especially for new users
            if (existingMemories.length < 5) {
                // For users with very few memories, store somewhat liberally (importance >= 5)
                jsonData.shouldStore = jsonData.importance >= 5;
            } else if (existingMemories.length < 15) {
                // For users with some history, be selective (importance >= 5)
                jsonData.shouldStore = jsonData.importance >= 5;
            } else {
                // For users with many memories, be quite selective (importance >= 6)
                jsonData.shouldStore = jsonData.importance >= 6;
            }
        }
        
        return jsonData;
    } catch (error) {
        console.error("Error analyzing memory importance:", error);
        // Return default values if the analysis fails
        return {
            importance: 3,
            extractedMemory: conversationText.substring(0, 100),
            topics: ["Sohbet"],
            reasoning: "Varsayılan hafıza oluşturma (analiz başarısız)",
            shouldStore: false // Don't store on error
        };
    }
};

/**
 * Delete a memory
 * @param {string} userId - The user ID
 * @param {string} memoryId - The memory ID to delete
 */
export const deleteMemory = async (userId, memoryId) => {
    try {
        const memoryRef = doc(db, "users", userId, "memories", memoryId);
        await deleteDoc(memoryRef);
        return true;
    } catch (error) {
        console.error("Error deleting memory:", error);
        throw error;
    }
};

/**
 * Delete all low importance memories for a user
 * @param {string} userId - The user ID
 * @param {number} importanceThreshold - Minimum importance to keep (default 5)
 * @returns {Promise<number>} - Number of memories deleted
 */
export const deleteLowImportanceMemories = async (userId, importanceThreshold = 5) => {
    try {
        const memoriesRef = collection(db, "users", userId, "memories");
        const q = query(
            memoriesRef,
            where("importance", "<", importanceThreshold)
        );
        
        const querySnapshot = await getDocs(q);
        let deleteCount = 0;
        
        const deleteBatch = [];
        querySnapshot.forEach((doc) => {
            deleteBatch.push(deleteDoc(doc.ref));
            deleteCount++;
        });
        
        await Promise.all(deleteBatch);
        
        return deleteCount;
    } catch (error) {
        console.error("Error deleting low importance memories:", error);
        throw error;
    }
};

/**
 * Smart memory search using Firebase queries - no AI needed!
 * @param {string} userId - The user ID
 * @param {string} searchQuery - The search query
 */
export const smartSearchMemories = async (userId, searchQuery) => {
    try {
        const memoriesRef = collection(db, "users", userId, "memories");
        
        // Get ALL memories first (simpler and more reliable)
        const allMemoriesQuery = query(memoriesRef, orderBy("importance", "desc"));
        const querySnapshot = await getDocs(allMemoriesQuery);
        
        const memories = [];
        const queryLower = searchQuery.toLowerCase();
        
        // Detect what type of query this is
        const isNameQuery = /(?:ad|name|isim|neydi|what.*name|benim ad|my name)/i.test(searchQuery);
        const isAddressQuery = /(?:hitap|address|call|diye|nasıl|how.*call|ne diye)/i.test(searchQuery);
        
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const decryptedContent = await decryptMemoryContent(data.content); // Decrypt for search
            const content = (decryptedContent || '').toLowerCase();
            const topic = (data.topic || '').toLowerCase();
            
            let relevanceScore = 0;
            
            // High priority matching for name/identity queries
            if (isNameQuery || isAddressQuery) {
                // Look for name-related content
                if (content.includes('emin')) relevanceScore += 10;
                if (content.includes('hitap')) relevanceScore += 8;
                if (content.includes('diye')) relevanceScore += 6;
                if (topic.includes('user requested memory')) relevanceScore += 8;
                if (topic.includes('user')) relevanceScore += 4;
            }
            
            // Regular keyword matching
            const searchTerms = queryLower.split(' ').filter(term => term.length > 1);
            searchTerms.forEach(term => {
                if (content.includes(term)) relevanceScore += 2;
                if (topic.includes(term)) relevanceScore += 1;
            });
            
            // Always include memories with any relevance for name queries
            if ((isNameQuery || isAddressQuery) && relevanceScore >= 4) {
                memories.push({ 
                    id: doc.id, 
                    ...data,
                    content: decryptedContent, // Use decrypted content
                    relevanceScore 
                });
            } else if (relevanceScore > 0) {
                memories.push({ 
                    id: doc.id, 
                    ...data,
                    content: decryptedContent, // Use decrypted content
                    relevanceScore 
                });
            }
        }
        
        // Sort by relevance score then importance
        memories.sort((a, b) => {
            if (b.relevanceScore !== a.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            return b.importance - a.importance;
        });
        

        
        return memories.slice(0, MAX_MEMORIES);
        
    } catch (error) {
        console.error("Error in smart memory search:", error);
        // Fallback to original simple search
        return await searchMemories(userId, searchQuery);
    }
}; 