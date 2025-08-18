import React from 'react';
import styles from './Home.module.css';
import { motion } from 'framer-motion';
import { FaHeartbeat, FaBrain, FaUserFriends } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { currentUser } = useAuth();
    
    return (
        <section className={styles.homeContainer}>
            <div className={styles.heroSection}>
                <motion.h1 
                    className={styles.title}
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    TherapyAI'ya Hoş Geldiniz
                </motion.h1>
                
                <motion.p 
                    className={styles.lead}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                >
                    Gelişmiş yapay zeka ve şefkatli bakımın buluştuğu destekleyici bir alan keşfedin.
                    Daha iyi bir ruh sağlığına giden yolculuğunuz burada başlıyor.
                </motion.p>
                
                <motion.div 
                    className={styles.ctaButton}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <a href="/support">Seansınızı Başlatın</a>
                </motion.div>
            </div>
            
            <div className={styles.imageSection}>
                <motion.div 
                    className={styles.imageContainer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.9 }}
                >
                    <div className={styles.therapyImage}></div>
                </motion.div>
            </div>
            
            <motion.div 
                className={styles.featuresSection}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.2 }}
            >
                <h2>Nasıl Yardımcı Olabiliriz</h2>
                <div className={styles.featureCards}>
                    <motion.div 
                        className={styles.featureCard}
                        whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                    >
                        <FaHeartbeat className={styles.featureIcon} />
                        <h3>Duygusal Destek</h3>
                        <p>Hayatın zorluklarını güvenle aşmanıza yardımcı olacak 7/24 rehberlik.</p>
                    </motion.div>
                    
                    <motion.div 
                        className={styles.featureCard}
                        whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                    >
                        <FaBrain className={styles.featureIcon} />
                        <h3>Bilişsel Teknikler</h3>
                        <p>Düşünceleri yeniden şekillendirmek ve zihinsel refahı artırmak için pratik beceriler öğrenin.</p>
                    </motion.div>
                    
                    <motion.div 
                        className={styles.featureCard}
                        whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                    >
                        <FaUserFriends className={styles.featureIcon} />
                        <h3>Kişiselleştirilmiş Yaklaşım</h3>
                        <p>Benzersiz ihtiyaç ve tercihlerinize göre uyarlanmış yapay zeka destekli rehberlik.</p>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
};

export default Home;
