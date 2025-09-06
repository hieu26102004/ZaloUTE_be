import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reaction, REACTION_TYPES } from '../models/reaction.schema';

@Injectable()
export class ReactionService {
  constructor(
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
  ) {}

  /**
   * Nếu user đã thả cùng loại reaction thì xóa (bỏ reaction),
   * nếu khác loại thì update sang loại mới.
   */
  async addReaction(messageId: string, userId: string, type: string, options?: { conversationId?: string }) {
    if (!REACTION_TYPES.includes(type)) {
      throw new Error('Invalid reaction type');
    }
    const existing = await this.reactionModel.findOne({ messageId, userId });
    if (existing) {
      if (existing.type === type) {
        // Bỏ reaction
        await this.reactionModel.deleteOne({ _id: existing._id });
        return null;
      } else {
        // Đổi sang loại khác
        existing.type = type;
        await existing.save();
        return existing;
      }
    } else {
      // Thả mới
      const created = await this.reactionModel.create({ messageId, userId, type });
      return created;
    }
  }

  async removeReaction(messageId: string, userId: string) {
    return this.reactionModel.findOneAndDelete({ messageId, userId });
  }

  /**
   * Trả về dạng:
   * {
   *   like: { count: 2, userIds: [...] },
   *   love: { count: 1, userIds: [...] },
   *   ...
   * }
   */
  async getReactionsByMessage(messageId: string) {
    const reactions = await this.reactionModel.find({ messageId });
    const grouped: Record<string, { count: number; userIds: string[] }> = {};
    for (const type of REACTION_TYPES) {
      grouped[type] = { count: 0, userIds: [] };
    }
    for (const r of reactions) {
      if (grouped[r.type]) {
        grouped[r.type].count++;
        grouped[r.type].userIds.push(r.userId.toString());
      }
    }
    return grouped;
  }
}
