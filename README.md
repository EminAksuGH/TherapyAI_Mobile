# TherapyAI Mobile App 📱

A React Native mobile application for AI-powered therapy and mental health support, designed specifically for Turkish users.

## 🌟 Features

- **AI-Powered Therapy Sessions**: 24/7 available AI therapist using advanced natural language processing
- **Secure & Private**: End-to-end encrypted conversations using AES-GCM encryption
- **Memory System**: Personalized therapy experience with AI memory of important details
- **Multi-Theme Support**: Light and dark mode for comfortable usage
- **Cross-Platform**: Runs on both iOS and Android devices
- **Turkish Language Support**: Optimized for Turkish language and culture
- **Conversation Management**: Save, load, and manage therapy sessions
- **Feedback System**: Rate and provide feedback on AI responses

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd TherapyAI_Mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Firebase Configuration
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # OpenAI Configuration
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

### Running on Devices

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

#### Web (for testing)
```bash
npm run web
```

## 📱 App Structure

```
TherapyAI_Mobile/
├── components/           # Reusable UI components
│   ├── ConversationSidebar.js
│   ├── FeedbackModal.js
│   └── ProfileDropdown.js
├── context/             # React Context providers
│   ├── AuthContext.js   # Authentication state management
│   ├── MemoryContext.js # AI memory management
│   └── ThemeContext.js  # Theme and styling
├── firebase/            # Firebase services
│   ├── firebase.js      # Firebase configuration
│   ├── encryptionService.js # Message encryption
│   ├── feedbackService.js   # User feedback handling
│   └── memoryService.js     # AI memory storage
├── screens/             # App screens
│   ├── HomeScreen.js    # Welcome and feature overview
│   ├── LoginScreen.js   # User authentication
│   ├── SignupScreen.js  # User registration
│   ├── ChatScreen.js    # Main therapy chat interface
│   ├── ProfileScreen.js # User profile management
│   ├── MemoryListScreen.js # AI memory management
│   └── LoadingScreen.js # Loading states
├── assets/              # Static assets (images, icons)
├── android/             # Android native code
├── App.js              # Main app component
└── package.json        # Dependencies and scripts
```

## 🔧 Key Technologies

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **Firebase**: Backend services (Authentication, Firestore)
- **React Navigation**: Screen navigation
- **OpenAI GPT-4**: AI conversation engine
- **AES-GCM Encryption**: Message security
- **React Context**: State management

## 🔐 Security Features

- **End-to-End Encryption**: All messages are encrypted before storing
- **Secure Authentication**: Firebase Authentication with email verification
- **Data Privacy**: User data is anonymized and encrypted
- **Secure Storage**: Sensitive data stored using Expo SecureStore

## 🎨 UI/UX Features

- **Modern Design**: Clean, therapy-focused interface
- **Accessibility**: Screen reader support and high contrast modes
- **Responsive**: Optimized for different screen sizes
- **Smooth Animations**: Engaging user interactions
- **Intuitive Navigation**: Easy-to-use interface for all age groups

## 🚀 Deployment

### Building for Production

#### Android APK
```bash
expo build:android
```

#### iOS App Store
```bash
expo build:ios
```

### App Store Guidelines

The app complies with:
- Google Play Store policies for health apps
- Apple App Store guidelines for medical applications
- GDPR and data protection regulations

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

## 🔮 Future Features

- [ ] Voice chat support
- [ ] Mood tracking and analytics
- [ ] Appointment scheduling with human therapists
- [ ] Group therapy sessions
- [ ] Meditation and relaxation exercises
- [ ] Crisis intervention features
- [ ] Multi-language support expansion

---

**Note**: This is a therapy support tool and should not replace professional mental health care. Always consult with qualified healthcare providers for serious mental health concerns.
