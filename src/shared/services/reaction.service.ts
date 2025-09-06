import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reaction } from '../models/reaction.schema';

@Injectable()
export class ReactionService {
  constructor(
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
  ) {}

  async addReaction(messageId: string, userId: string, type: string, options?: { conversationId?: string }) {
      return this.reactionModel.findOneAndUpdate(
        { messageId, userId },
        { type },
        { upsert: true, new: true },
      );
  }

  async removeReaction(messageId: string, userId: string) {
    return this.reactionModel.findOneAndDelete({ messageId, userId });
  }

  async getReactionsByMessage(messageId: string) {
    return this.reactionModel.find({ messageId });
  }
}
