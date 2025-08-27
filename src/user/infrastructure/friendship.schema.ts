import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
}

@Schema({ timestamps: true })
export class Friendship extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(FriendshipStatus),
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);

// Tạo index để tìm kiếm nhanh hơn
FriendshipSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true });
FriendshipSchema.index({ requesterId: 1 });
FriendshipSchema.index({ receiverId: 1 });
