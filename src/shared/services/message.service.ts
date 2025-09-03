import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../models/message.schema';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async createMessage(conversation: Types.ObjectId, sender: Types.ObjectId, content: string, type: string = 'text') {
    return this.messageModel.create({ conversation, sender, content, type });
  }

  async getMessages(conversation: Types.ObjectId, limit = 20, skip = 0) {
    return this.messageModel.find({ conversation })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username email firstname lastname avatarUrl')
      .exec();
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
