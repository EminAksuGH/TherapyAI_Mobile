import React from 'react';
import MemoryManager from '../components/MemoryManager';
import styles from './MemoryList.module.css';

const MemoryList = () => {
  return (
    <div className={styles.memoryListContainer}>
      <div className={styles.pageTitle}>
        <h2>Hafıza Listesi</h2>
        <p>Daha önce kaydedilen tüm anıları burada görebilir ve yönetebilirsiniz.</p>
      </div>
      <div className={styles.memoryManagerWrapper}>
        <MemoryManager />
      </div>
    </div>
  );
};

export default MemoryList; 