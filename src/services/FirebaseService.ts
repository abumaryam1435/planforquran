import { doc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';

export class FirebaseService {
  /**
   * Validates database connection with the Cloud Firestore server on startup
   */
  static async validateConnection(): Promise<boolean> {
    try {
      // Create a test query using getDocFromServer to verify live connection
      const testDocRef = doc(db, 'test', 'connection');
      await getDocFromServer(testDocRef);
      console.log('Firebase connection validated successfully.');
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('client is offline')) {
        console.warn('Firebase connection: Client is currently offline.');
      } else {
        console.warn('Firebase connection warning/attempt:', error);
      }
      return false;
    }
  }

  /**
   * Utility to check current online status
   */
  static isOnline(): boolean {
    return typeof window !== 'undefined' ? window.navigator.onLine : true;
  }

  /**
   * Monitor online/offline status changes
   */
  static onNetworkChange(callback: (online: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}
