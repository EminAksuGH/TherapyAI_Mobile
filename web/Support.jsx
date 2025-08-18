import React from 'react';
import ChatWidget from '../components/ChatWidget';
import styles from './Support.module.css';

const Support = () => {
    return (
        <div className={styles.supportWrapper}>
            <div className={styles.supportContent}>
                <ChatWidget />
            </div>
        </div>
    );
};

export default Support;
