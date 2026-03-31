// Utility function to send notifications to specific users
// Can be called from browser console: window.sendNotificationToUser('ahmad2@gmail.com', 'announcement', 'Title', 'Message')

import { notificationService } from '../services/notificationService';

export function sendNotificationToUser(
  userEmail: string,
  type: 'assignment' | 'exam' | 'announcement' | 'grade' | 'message' | 'deadline',
  title: string,
  message: string,
  link?: string
): void {
  const success = notificationService.sendNotificationToUser(userEmail, type, title, message, link);
  
  if (success) {
    console.log(`✅ Notification sent to ${userEmail}`);
    console.log(`Title: ${title}`);
    console.log(`Message: ${message}`);
  } else {
    console.error(`❌ Failed to send notification to ${userEmail}`);
  }
}

// Make it available globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).sendNotificationToUser = sendNotificationToUser;
  
  // Also add a function to send notification to current user (for testing)
  (window as any).sendNotificationToMe = (type: string, title: string, message: string, link?: string) => {
    try {
      // Get user from localStorage
      const authData = localStorage.getItem('academix.auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const user = parsed?.state?.user || null;
        if (user && user.email) {
          sendNotificationToUser(user.email, type as any, title, message, link);
          console.log('✅ Notification sent to current user!');
          // Trigger a reload of notifications
          window.dispatchEvent(new Event('notificationUpdate'));
        } else {
          console.error('❌ No user logged in');
        }
      } else {
        console.error('❌ No user logged in');
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error);
    }
  };
  
  console.log('💡 Notification functions available:');
  console.log('  - window.sendNotificationToUser(email, type, title, message, link?)');
  console.log('  - window.sendNotificationToMe(type, title, message, link?) - sends to current user');
  console.log('Example: window.sendNotificationToMe("announcement", "Hello", "This is a test")');
}

