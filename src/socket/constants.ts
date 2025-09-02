// Định nghĩa các tên sự kiện socket để dùng chung
export const SOCKET_EVENTS = {
  // Message events
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  GET_MESSAGES: 'get_messages',
  GET_MESSAGES_RESULT: 'get_messages_result',
  
  // Conversation events
  GET_CONVERSATIONS: 'get_conversations',
  GET_CONVERSATIONS_RESULT: 'get_conversations_result',
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  
  // User status events
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  
  // Error events
  ERROR: 'socket_error',
  CONNECTION_SUCCESS: 'connection_success',
} as const;
