import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../models/message.schema';
import { ReactionService } from './reaction.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly reactionService: ReactionService,
  ) {}

  async createMessage(conversation: Types.ObjectId, sender: Types.ObjectId, content: string, type: string = 'text') {
    return this.messageModel.create({ conversation, sender, content, type });
  }

  async getMessages(conversation: Types.ObjectId, limit = 20, skip = 0) {
    const messages = await this.messageModel.find({ conversation })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username email firstname lastname avatarUrl')
      .lean()
      .exec();
    // Lấy reactions cho từng message song song
    const withReactions = await Promise.all(
      messages.map(async (msg) => {
        const reactions = await this.reactionService.getReactionsByMessage(String(msg._id));
        return { ...msg, reactions };
      })
    );
    return withReactions;
  }

  async getMessageById(messageId: Types.ObjectId) {
    return this.messageModel.findById(messageId)
      .populate('sender', 'username email firstname lastname avatarUrl')
      .exec();
  }

  async markAsRead(conversationId: Types.ObjectId, userId: Types.ObjectId) {
    return this.messageModel.updateMany(
      { 
        conversation: conversationId,
        sender: { $ne: userId },
        isRead: false
      },
      { isRead: true }
    );
  }

  async markMessageAsReadForUsers(messageId: Types.ObjectId, userIds: Types.ObjectId[]) {
    // For now, we'll just mark the message as read
    // In a more complex system, you might want to track which specific users have read the message
    return this.messageModel.updateOne(
      { _id: messageId },
      { isRead: true }
    );
  }

  async getMessageCount(conversationId: Types.ObjectId) {
    return this.messageModel.countDocuments({ conversation: conversationId });
  }

  async createTextMessage(conversationId: Types.ObjectId, senderId: Types.ObjectId, content: string) {
    return this.messageModel.create({
      conversation: conversationId,
      sender: senderId,
      content,
      type: 'text'
    });
  }

  async searchMessages(conversationId: Types.ObjectId, query: string) {
    return this.messageModel.find({
      conversation: conversationId,
      content: { $regex: query, $options: 'i' }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'username email firstname lastname avatarUrl')
    .exec();
  }
}
