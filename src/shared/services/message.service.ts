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
      .populate('sender')
      .exec();
  }
}
