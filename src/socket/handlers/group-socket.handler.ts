import { Injectable, Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ConversationService } from '../../shared/services/conversation.service';
import { Types } from 'mongoose';
import { 
  CreateGroupSocketDto, 
  UpdateGroupNameSocketDto, 
  AddGroupMemberSocketDto, 
  RemoveGroupMemberSocketDto, 
  LeaveGroupSocketDto, 
  TransferGroupAdminSocketDto,
  DissolveGroupSocketDto
} from '../dto/group-socket.dto';
import { SOCKET_EVENTS } from '../constants';

@Injectable()
export class GroupSocketHandler {
  private readonly logger = new Logger(GroupSocketHandler.name);

  constructor(
    private readonly conversationService: ConversationService,
  ) {}

  async handleCreateGroup(socket: Socket, io: Server, data: CreateGroupSocketDto) {
    try {
      const userId = new Types.ObjectId((socket as any).data?.userId);
      const participantObjectIds = data.participantIds.map((id: string) => new Types.ObjectId(id));
      
      const conversation = await this.conversationService.createGroupConversation(
        userId,
        participantObjectIds,
        data.name
      );

      // Join creator to the conversation room
      await socket.join(`conversation_${conversation._id}`);
      
      // Notify all participants about the new group
      io.to(`conversation_${conversation._id}`).emit(SOCKET_EVENTS.GROUP_CREATED, {
        conversation,
        createdBy: userId.toString()
      });

      this.logger.log(`Group created: ${conversation._id} by user ${userId}`);
      
      socket.emit(SOCKET_EVENTS.GROUP_CREATED, {
        success: true,
        conversation
      });
    } catch (error) {
      this.logger.error('Create group error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message || 'Failed to create group',
        event: 'create_group'
      });
    }
  }

  async handleUpdateGroupName(socket: Socket, io: Server, data: UpdateGroupNameSocketDto) {
    try {
      const userId = new Types.ObjectId((socket as any).data?.userId);
      const conversationId = new Types.ObjectId(data.conversationId);
      
      const conversation = await this.conversationService.updateGroupName(
        conversationId,
        data.name,
        userId
      );

      // Notify all group members
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.GROUP_NAME_UPDATED, {
        conversationId: conversationId.toString(),
        newName: data.name,
        updatedBy: userId.toString(),
        conversation
      });

      this.logger.log(`Group name updated: ${conversationId} by user ${userId}`);
    } catch (error) {
      this.logger.error('Update group name error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message || 'Failed to update group name',
        event: 'update_group_name'
      });
    }
  }

  async handleAddGroupMembers(socket: Socket, io: Server, data: AddGroupMemberSocketDto) {
    try {
      const userId = new Types.ObjectId((socket as any).data?.userId);
      const conversationId = new Types.ObjectId(data.conversationId);
      const userObjectIds = data.userIds.map((id: string) => new Types.ObjectId(id));
      
      const conversation = await this.conversationService.addGroupMembers(
        conversationId,
        userObjectIds,
        userId
      );

      // Join new members to the conversation room (if they're online)
      const newMemberIds = userObjectIds.map(id => id.toString());
      
      // Notify all group members about new additions
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.GROUP_MEMBER_ADDED, {
        conversationId: conversationId.toString(),
        newMemberIds,
        addedBy: userId.toString(),
        conversation
      });

      this.logger.log(`Members added to group: ${conversationId} by user ${userId}`);
    } catch (error) {
      this.logger.error('Add group members error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message || 'Failed to add group members',
        event: 'add_group_members'
      });
    }
  }

  async handleRemoveGroupMember(socket: Socket, io: Server, data: RemoveGroupMemberSocketDto) {
    try {
      const adminId = new Types.ObjectId((socket as any).data?.userId);
      const conversationId = new Types.ObjectId(data.conversationId);
      const userIdToRemove = new Types.ObjectId(data.userId);
      
      const conversation = await this.conversationService.removeGroupMember(
        conversationId,
        userIdToRemove,
        adminId
      );

      // Notify all group members about member removal
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.GROUP_MEMBER_REMOVED, {
        conversationId: conversationId.toString(),
        removedUserId: data.userId,
        removedBy: adminId.toString(),
        conversation
      });

      this.logger.log(`Member removed from group: ${conversationId} by admin ${adminId}`);
    } catch (error) {
      this.logger.error('Remove group member error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message || 'Failed to remove group member',
        event: 'remove_group_member'
      });
    }
  }

  async handleLeaveGroup(socket: Socket, io: Server, data: LeaveGroupSocketDto) {
    try {
      const userId = new Types.ObjectId((socket as any).data?.userId);
      const conversationId = new Types.ObjectId(data.conversationId);
      
      const conversation = await this.conversationService.leaveGroup(conversationId, userId);

      // Leave the socket room
      await socket.leave(`conversation_${conversationId}`);

      // Notify remaining group members
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.GROUP_MEMBER_LEFT, {
        conversationId: conversationId.toString(),
        leftUserId: userId.toString(),
        conversation
      });

      this.logger.log(`User left group: ${userId} from ${conversationId}`);
      
      socket.emit(SOCKET_EVENTS.GROUP_MEMBER_LEFT, {
        success: true,
        conversationId: conversationId.toString()
      });
    } catch (error) {
      this.logger.error('Leave group error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message || 'Failed to leave group',
        event: 'leave_group'
      });
    }
  }

  async handleTransferGroupAdmin(socket: Socket, io: Server, data: TransferGroupAdminSocketDto) {
    try {
      const currentAdminId = new Types.ObjectId((socket as any).data?.userId);
      const conversationId = new Types.ObjectId(data.conversationId);
      const newAdminId = new Types.ObjectId(data.newAdminId);
      
      const conversation = await this.conversationService.transferGroupAdmin(
        conversationId,
        newAdminId,
        currentAdminId
      );

      // Notify all group members about admin transfer
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.GROUP_ADMIN_TRANSFERRED, {
        conversationId: conversationId.toString(),
        oldAdminId: currentAdminId.toString(),
        newAdminId: data.newAdminId,
        conversation
      });

      this.logger.log(`Group admin transferred: ${conversationId} from ${currentAdminId} to ${newAdminId}`);
    } catch (error) {
      this.logger.error('Transfer group admin error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message || 'Failed to transfer group admin',
        event: 'transfer_group_admin'
      });
    }
  }

  async handleDissolveGroup(socket: Socket, io: Server, data: DissolveGroupSocketDto) {
    try {
      const adminId = new Types.ObjectId((socket as any).data?.userId);
      const conversationId = new Types.ObjectId(data.conversationId);
      
      await this.conversationService.dissolveGroup(conversationId, adminId);

      // Notify all group members about group dissolution
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.GROUP_DISSOLVED, {
        conversationId: conversationId.toString(),
        adminId: adminId.toString(),
        message: 'Group has been dissolved by admin'
      });

      this.logger.log(`Group dissolved: ${conversationId} by admin ${adminId}`);
    } catch (error) {
      this.logger.error('Dissolve group error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message || 'Failed to dissolve group',
        event: 'dissolve_group'
      });
    }
  }
}



