import React from 'react';
import styles from './About.module.css';
import { motion } from 'framer-motion';
import { FaAward, FaLock, FaRobot, FaHandHoldingHeart } from 'react-icons/fa';

const About = () => {
    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { 
                staggerChildren: 0.3
            }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.section 
            className={styles.aboutContainer}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className={styles.aboutHero}>
                <motion.h1 
                    className={styles.aboutTitle}
                    variants={itemVariants}
                >
                    TherapyAI Projesi Hakkında
                </motion.h1>
            </div>
            
            <motion.div 
                className={styles.aboutContent}
                variants={itemVariants}
            >
                <div className={styles.aboutTextSection}>
                    <h2>Projemiz</h2>
                    <p className={styles.aboutText}>
                        TherapyAI projesi, Türkiye'de ruh sağlığı hizmetlerine erişimi kolaylaştırmak ve 
                        yaygınlaştırmak amacıyla geliştirilmiştir. Ülkemizde artan ruh sağlığı sorunları ve 
                        terapist sayısının yetersizliği göz önüne alındığında, yapay zeka destekli çözümlerin 
                        önemi giderek artmaktadır.
                    </p>
                    <p className={styles.aboutText}>
                        Bu proje, en son yapay zeka teknolojilerini kullanarak, kullanıcıların günlük 
                        streslerini yönetmelerine, duygusal zorlukları aşmalarına ve zihinsel sağlıklarını 
                        iyileştirmelerine yardımcı olmayı hedeflemektedir. Geleneksel terapi yöntemlerinin 
                        tamamlayıcısı olarak hizmet veren sistemimiz, 7/24 erişilebilir destek sağlar.
                    </p>
                    <p className={styles.aboutText}>
                        Uygulamamız, bilişsel davranışçı terapi, farkındalık temelli stres azaltma ve 
                        pozitif psikoloji gibi kanıtlanmış yaklaşımları temel alarak geliştirilmiştir. 
                        Kullanıcılarımıza özel olarak uyarlanmış, kişiselleştirilmiş bir deneyim sunmak 
                        için sürekli olarak kendini geliştirmektedir.
                    </p>
                </div>
            </motion.div>
            
            <motion.div 
                className={styles.valuesSection}
                variants={itemVariants}
            >
                <h2>Temel Değerlerimiz</h2>
                <div className={styles.valueCards}>
                    <motion.div 
                        className={styles.valueCard}
                        whileHover={{ y: -10, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
                    >
                        <FaHandHoldingHeart className={styles.valueIcon} />
                        <h3>Önce Şefkat</h3>
                        <p>Her etkileşime gerçek ilgi ve empatiyle yaklaşarak kendinizi anlaşılmış hissetmenizi sağlıyoruz.</p>
                    </motion.div>
                    
                    <motion.div 
                        className={styles.valueCard}
                        whileHover={{ y: -10, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
                    >
                        <FaAward className={styles.valueIcon} />
                        <h3>Kanıta Dayalı</h3>
                        <p>Yöntemlerimiz, psikolojik araştırmalara ve kanıtlanmış terapötik yaklaşımlara dayanmaktadır.</p>
                    </motion.div>
                    
                    <motion.div 
                        className={styles.valueCard}
                        whileHover={{ y: -10, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
                    >
                        <FaLock className={styles.valueIcon} />
                        <h3>Gizlilik ve Güvenlik</h3>
                        <p>Verileriniz ve konuşmalarınız kurumsal düzeyde güvenlik önlemleriyle korunmaktadır.</p>
                    </motion.div>
                    
                    <motion.div 
                        className={styles.valueCard}
                        whileHover={{ y: -10, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
                    >
                        <FaRobot className={styles.valueIcon} />
                        <h3>Sürekli Öğrenme</h3>
                        <p>Yapay zeka sistemlerimiz, daha iyi, daha kişiselleştirilmiş destek sağlamak için sürekli gelişmektedir.</p>
                    </motion.div>
                </div>
            </motion.div>
            
            <motion.div 
                className={styles.teamSection}
                variants={itemVariants}
            >
                <h2>Teknik Altyapımız</h2>
                <p className={styles.aboutText}>
                    TherapyAI, doğal dil işleme ve derin öğrenme gibi ileri teknolojileri kullanarak 
                    geliştirilen güçlü bir yapay zeka altyapısına sahiptir. Sistemimiz, Türkçe dil 
                    özelliklerini anlayacak şekilde özel olarak eğitilmiş ve Türk kültürüne uygun 
                    yanıtlar verecek şekilde optimize edilmiştir.
                </p>
                <p className={styles.aboutText}>
                    Kullanıcı mahremiyeti ve veri güvenliği konusunda en yüksek standartları benimsiyor, 
                    kişisel verilerin korunması için uluslararası güvenlik protokollerini uyguluyoruz. 
                    Tüm veriler anonimleştirilmiş şekilde işlenmekte ve yalnızca hizmet kalitesini 
                    artırmak amacıyla kullanılmaktadır.
                </p>
                <div className={styles.ctaContainer}>
                    <motion.a 
                        href="/support" 
                        className={styles.aboutCta}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        TherapyAI'yı Deneyimleyin
                    </motion.a>
                </div>
            </motion.div>
        </motion.section>
    );
};

export default About;
