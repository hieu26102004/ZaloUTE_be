import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ReactionService } from '../../shared/services/reaction.service';
import { MessageService } from '../../shared/services/message.service';
import { Types } from 'mongoose';

@Injectable()
export class ReactionSocketHandler {
  constructor(
    private readonly reactionService: ReactionService,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Nếu type === 'reaction' => update reaction
   * Nếu type === 'sticker' hoặc 'emoji' => gửi message mới (cần truyền conversationId, value là stickerId/emoji)
   */
  async handleAddReaction(payload: { messageId: string; userId: string; type: string; conversationId?: string; value?: string }) {
    if (payload.type === 'reaction') {
      return this.reactionService.addReaction(payload.messageId, payload.userId, payload.type);
    }
    if ((payload.type === 'sticker' || payload.type === 'emoji') && payload.conversationId && payload.value) {
      // Debug log
      console.log('[DEBUG] handleAddReaction - Creating message:', {
        conversationId: payload.conversationId,
        userId: payload.userId,
        value: payload.value,
        type: payload.type,
      });
      const result = await this.messageService.createMessage(
        new Types.ObjectId(payload.conversationId),
        new Types.ObjectId(payload.userId),
        payload.value,
        payload.type
      );
      console.log('[DEBUG] handleAddReaction - Message created:', result);
      return result;
    }
    throw new Error('Invalid reaction type or missing data');
  }

  async handleRemoveReaction(payload: { messageId: string; userId: string }) {
    return this.reactionService.removeReaction(payload.messageId, payload.userId);
  }

  async handleGetReactions(messageId: string) {
    return this.reactionService.getReactionsByMessage(messageId);
  }
}
