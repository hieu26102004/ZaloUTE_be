import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from '../models/conversation.schema';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
  ) {}

  async findUserConversations(userId: Types.ObjectId) {
    return this.conversationModel
      .find({ participants: userId })
      .populate('participants', 'username email firstname lastname avatarUrl')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOrCreatePrivateConversation(userA: Types.ObjectId, userB: Types.ObjectId) {
    let conversation = await this.conversationModel.findOne({
      participants: { $all: [userA, userB], $size: 2 },
      type: 'private',
    });
    
    if (!conversation) {
      conversation = await this.conversationModel.create({
        participants: [userA, userB],
        type: 'private',
      });
    }
    
    return conversation;
  }

  async findConversationById(conversationId: Types.ObjectId) {
    return this.conversationModel
      .findById(conversationId)
      .populate('participants', 'username email firstname lastname avatarUrl')
      .exec();
  }

  async createGroupConversation(creatorId: Types.ObjectId, participantIds: Types.ObjectId[], name?: string) {
    const allParticipants = [creatorId, ...participantIds.filter(id => !id.equals(creatorId))];
    
    return this.conversationModel.create({
      participants: allParticipants,
      type: 'group',
      name: name || `Group ${Date.now()}`,
    });
  }

  async getUserConversations(userId: Types.ObjectId) {
    return this.conversationModel
      .find({ participants: userId })
      .populate('participants', 'username email firstname lastname avatarUrl')
      .sort({ updatedAt: -1 })
      .exec();
  }
}
