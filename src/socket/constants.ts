// Định nghĩa các tên sự kiện socket để dùng chung
export const SOCKET_EVENTS = {
  // Message events
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  GET_MESSAGES: 'get_messages',
  GET_MESSAGES_RESULT: 'get_messages_result',
  MARK_AS_READ: 'mark_as_read',
  MESSAGES_READ: 'messages_read',
  
  // Conversation events
  GET_CONVERSATIONS: 'get_conversations',
  GET_CONVERSATIONS_RESULT: 'get_conversations_result',
  CONVERSATION_UPDATED: 'conversation_updated',
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  
  // Group management events
  GROUP_CREATED: 'group_created',
  GROUP_NAME_UPDATED: 'group_name_updated',
  GROUP_AVATAR_UPDATED: 'group_avatar_updated',
  GROUP_MEMBER_ADDED: 'group_member_added',
  GROUP_MEMBER_REMOVED: 'group_member_removed',
  GROUP_MEMBER_LEFT: 'group_member_left',
  GROUP_ADMIN_TRANSFERRED: 'group_admin_transferred',
  GROUP_DISSOLVED: 'group_dissolved',
  
  // User status events
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  
  // Reaction events
  ADD_REACTION: 'add_reaction',
  REMOVE_REACTION: 'remove_reaction',
  GET_REACTIONS: 'get_reactions',
  REACTIONS_RESULT: 'reactions_result',
  MESSAGE_REACTION_UPDATED: 'message_reaction_updated',

  // Error events
  ERROR: 'socket_error',
  CONNECTION_SUCCESS: 'connection_success',
} as const;
