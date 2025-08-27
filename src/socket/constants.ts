// Định nghĩa các tên sự kiện socket để dùng chung
export const SOCKET_EVENTS = {
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  GET_MESSAGES: 'get_messages',
  GET_MESSAGES_RESULT: 'get_messages_result',
  GET_CONVERSATIONS: 'get_conversations',
  GET_CONVERSATIONS_RESULT: 'get_conversations_result',
  ERROR: 'socket_error',
} as const;
