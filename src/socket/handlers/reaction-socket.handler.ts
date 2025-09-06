import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ReactionService } from '../../shared/services/reaction.service';
import { REACTION_TYPES } from '../../shared/models/reaction.schema';
import { MessageService } from '../../shared/services/message.service';
import { Types } from 'mongoose';

@Injectable()
export class ReactionSocketHandler {
  constructor(
    private readonly reactionService: ReactionService,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Xử lý thả cảm xúc cho message (Messenger style)
   * Nếu user đã thả cùng loại thì bỏ, khác loại thì đổi, chưa thả thì thêm mới
   */
  async handleAddReaction(payload: { messageId: string; userId: string; type: string }) {
    if (!REACTION_TYPES.includes(payload.type)) {
      throw new Error('Invalid reaction type');
    }
    return this.reactionService.addReaction(payload.messageId, payload.userId, payload.type);
  }

  async handleRemoveReaction(payload: { messageId: string; userId: string }) {
    return this.reactionService.removeReaction(payload.messageId, payload.userId);
  }

  async handleGetReactions(messageId: string) {
    return this.reactionService.getReactionsByMessage(messageId);
  }
}
