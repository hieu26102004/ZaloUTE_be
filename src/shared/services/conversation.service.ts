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
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username email firstname lastname avatarUrl'
        }
      })
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
    // Validate minimum 3 members (creator + 2 others)
    if (participantIds.length < 2) {
      throw new Error('Group must have at least 3 members (including creator)');
    }

    // Check for duplicate participant IDs
    const uniqueParticipantIds = new Set(participantIds.map(id => id.toString()));
    if (uniqueParticipantIds.size !== participantIds.length) {
      throw new Error('Duplicate participant IDs are not allowed');
    }

    // Check if creator is included in participantIds (should not be)
    const creatorIdString = creatorId.toString();
    const hasCreatorInParticipants = participantIds.some(id => id.toString() === creatorIdString);
    if (hasCreatorInParticipants) {
      throw new Error('Creator should not be included in participant list');
    }

    // Filter out any potential duplicates and creator (extra safety)
    const filteredParticipants = participantIds.filter(id => !id.equals(creatorId));
    const allParticipants = [creatorId, ...filteredParticipants];
    
    return this.conversationModel.create({
      participants: allParticipants,
      type: 'group',
      name: name || `Group ${Date.now()}`,
      groupAdmin: creatorId,
    });
  }

  async getUserConversations(userId: Types.ObjectId) {
    return this.conversationModel
      .find({ participants: userId })
      .populate('participants', 'username email firstname lastname avatarUrl')
      .populate('groupAdmin', 'username email firstname lastname avatarUrl')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username email firstname lastname avatarUrl'
        }
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  // Group management methods
  async updateGroupName(conversationId: Types.ObjectId, name: string, adminId: Types.ObjectId) {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.type !== 'group') {
      throw new Error('Only group conversations can have their name updated');
    }
    
    if (!conversation.groupAdmin?.equals(adminId)) {
      throw new Error('Only group admin can update group name');
    }
    
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      { name },
      { new: true }
    ).populate('participants', 'username email firstname lastname avatarUrl')
     .populate('groupAdmin', 'username email firstname lastname avatarUrl');
  }

  async addGroupMembers(conversationId: Types.ObjectId, userIds: Types.ObjectId[], adminId: Types.ObjectId) {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.type !== 'group') {
      throw new Error('Can only add members to group conversations');
    }
    
    if (!conversation.groupAdmin?.equals(adminId)) {
      throw new Error('Only group admin can add members');
    }

    // Check for duplicate user IDs in the request
    const uniqueUserIds = new Set(userIds.map(id => id.toString()));
    if (uniqueUserIds.size !== userIds.length) {
      throw new Error('Duplicate user IDs are not allowed');
    }
    
    // Filter out users who are already participants
    const newMembers = userIds.filter(userId => 
      !conversation.participants.some(participantId => participantId.equals(userId))
    );
    
    if (newMembers.length === 0) {
      throw new Error('All users are already members of this group');
    }
    
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      { $addToSet: { participants: { $each: newMembers } } },
      { new: true }
    ).populate('participants', 'username email firstname lastname avatarUrl')
     .populate('groupAdmin', 'username email firstname lastname avatarUrl');
  }

  async removeGroupMember(conversationId: Types.ObjectId, userIdToRemove: Types.ObjectId, adminId: Types.ObjectId) {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.type !== 'group') {
      throw new Error('Can only remove members from group conversations');
    }
    
    if (!conversation.groupAdmin?.equals(adminId)) {
      throw new Error('Only group admin can remove members');
    }
    
    if (userIdToRemove.equals(adminId)) {
      throw new Error('Group admin cannot be removed from the group');
    }
    
    if (!conversation.participants.some(participantId => participantId.equals(userIdToRemove))) {
      throw new Error('User is not a member of this group');
    }
    
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      { $pull: { participants: userIdToRemove } },
      { new: true }
    ).populate('participants', 'username email firstname lastname avatarUrl')
     .populate('groupAdmin', 'username email firstname lastname avatarUrl');
  }

  async updateGroupAvatar(conversationId: Types.ObjectId, avatar: string, adminId: Types.ObjectId) {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.type !== 'group') {
      throw new Error('Only group conversations can have their avatar updated');
    }
    
    if (!conversation.groupAdmin?.equals(adminId)) {
      throw new Error('Only group admin can update group avatar');
    }
    
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      { avatar },
      { new: true }
    ).populate('participants', 'username email firstname lastname avatarUrl')
     .populate('groupAdmin', 'username email firstname lastname avatarUrl');
  }

  async leaveGroup(conversationId: Types.ObjectId, userId: Types.ObjectId) {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.type !== 'group') {
      throw new Error('Can only leave group conversations');
    }
    
    if (conversation.groupAdmin?.equals(userId)) {
      throw new Error('Group admin cannot leave the group. Please transfer admin rights first.');
    }
    
    if (!conversation.participants.some(participantId => participantId.equals(userId))) {
      throw new Error('User is not a member of this group');
    }
    
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      { $pull: { participants: userId } },
      { new: true }
    ).populate('participants', 'username email firstname lastname avatarUrl')
     .populate('groupAdmin', 'username email firstname lastname avatarUrl');
  }

  async transferGroupAdmin(conversationId: Types.ObjectId, newAdminId: Types.ObjectId, currentAdminId: Types.ObjectId) {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.type !== 'group') {
      throw new Error('Can only transfer admin in group conversations');
    }
    
    if (!conversation.groupAdmin?.equals(currentAdminId)) {
      throw new Error('Only current group admin can transfer admin rights');
    }
    
    if (!conversation.participants.some(participantId => participantId.equals(newAdminId))) {
      throw new Error('New admin must be a member of the group');
    }
    
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      { groupAdmin: newAdminId },
      { new: true }
    ).populate('participants', 'username email firstname lastname avatarUrl')
     .populate('groupAdmin', 'username email firstname lastname avatarUrl');
  }

  // Dissolve group (delete group conversation)
  async dissolveGroup(conversationId: Types.ObjectId, adminId: Types.ObjectId) {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.type !== 'group') {
      throw new Error('Can only dissolve group conversations');
    }
    
    if (!conversation.groupAdmin?.equals(adminId)) {
      throw new Error('Only group admin can dissolve the group');
    }
    
    // Delete the conversation
    await this.conversationModel.findByIdAndDelete(conversationId);
    
    return { success: true, message: 'Group dissolved successfully' };
  }

  async updateLastMessage(conversationId: Types.ObjectId, messageId: Types.ObjectId) {
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      { 
        lastMessage: messageId,
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async getUpdatedConversation(conversationId: Types.ObjectId) {
    return this.conversationModel
      .findById(conversationId)
      .populate('participants', 'username email firstname lastname avatarUrl')
      .populate('groupAdmin', 'username email firstname lastname avatarUrl')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username email firstname lastname avatarUrl'
        }
      })
      .exec();
  }
}
