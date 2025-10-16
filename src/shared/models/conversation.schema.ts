import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  participants: Types.ObjectId[];

  @Prop({ type: String, enum: ['private', 'group'], default: 'private' })
  type: 'private' | 'group';

  @Prop({ type: String })
  name?: string; // For group chat

  @Prop({ type: String })
  avatar?: string; // For group chat

  @Prop({ type: Types.ObjectId, ref: 'User' })
  groupAdmin?: Types.ObjectId; // For group chat admin

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage?: Types.ObjectId; // Last message in conversation
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
