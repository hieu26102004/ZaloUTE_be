import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ConversationService } from '../services/conversation.service';
import { MessageService } from '../services/message.service';
import { Types } from 'mongoose';
import { 
  CreateGroupDto, 
  UpdateGroupNameDto, 
  AddGroupMemberDto, 
  RemoveGroupMemberDto, 
  UpdateGroupAvatarDto 
} from '../dto/group-management.dto';

@Controller('conversation')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  @Get('list')
  async getConversations(@Request() req: any) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const conversations = await this.conversationService.getUserConversations(userId);
      return conversations;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw new HttpException('Failed to get conversations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createConversation(@Body() body: any, @Request() req: any) {
    try {
      const { participantIds, name, isGroup } = body;
      const userId = new Types.ObjectId(req.user.userId);
      
      let conversation;
      if (isGroup) {
        const participantObjectIds = participantIds.map((id: string) => new Types.ObjectId(id));
        conversation = await this.conversationService.createGroupConversation(
          userId,
          participantObjectIds,
          name
        );
      } else {
        // For private conversation, there should be exactly one other participant
        if (participantIds.length !== 1) {
          throw new HttpException('Private conversation must have exactly one other participant', HttpStatus.BAD_REQUEST);
        }
        const otherUserId = new Types.ObjectId(participantIds[0]);
        conversation = await this.conversationService.findOrCreatePrivateConversation(userId, otherUserId);
      }
      
      return conversation;
    } catch (error) {
      console.error('Create conversation error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message || 'Failed to create conversation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Group management endpoints
  @Post('group')
  async createGroup(@Body() createGroupDto: CreateGroupDto, @Request() req: any) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const participantObjectIds = createGroupDto.participantIds.map((id: string) => new Types.ObjectId(id));
      
      const conversation = await this.conversationService.createGroupConversation(
        userId,
        participantObjectIds,
        createGroupDto.name
      );
      
      return conversation;
    } catch (error) {
      console.error('Create group error:', error);
      if (error.message.includes('at least 3 members') || 
          error.message.includes('Duplicate participant IDs') ||
          error.message.includes('Creator should not be included')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to create group', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':conversationId/group/name')
  async updateGroupName(
    @Param('conversationId') conversationId: string,
    @Body() updateGroupNameDto: UpdateGroupNameDto,
    @Request() req: any
  ) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      
      const conversation = await this.conversationService.updateGroupName(
        convId,
        updateGroupNameDto.name,
        userId
      );
      
      return conversation;
    } catch (error) {
      console.error('Update group name error:', error);
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Only group admin') || error.message.includes('Only group conversations')) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException('Failed to update group name', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':conversationId/group/members/add')
  async addGroupMembers(
    @Param('conversationId') conversationId: string,
    @Body() addGroupMemberDto: AddGroupMemberDto,
    @Request() req: any
  ) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      const userObjectIds = addGroupMemberDto.userIds.map((id: string) => new Types.ObjectId(id));
      
      const conversation = await this.conversationService.addGroupMembers(
        convId,
        userObjectIds,
        userId
      );
      
      return conversation;
    } catch (error) {
      console.error('Add group members error:', error);
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Only group admin') || error.message.includes('Can only add members')) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      if (error.message.includes('already members') || error.message.includes('Duplicate user IDs')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to add group members', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':conversationId/group/members/:userId')
  async removeGroupMember(
    @Param('conversationId') conversationId: string,
    @Param('userId') userIdToRemove: string,
    @Request() req: any
  ) {
    try {
      const adminId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      const userToRemoveId = new Types.ObjectId(userIdToRemove);
      
      const conversation = await this.conversationService.removeGroupMember(
        convId,
        userToRemoveId,
        adminId
      );
      
      return conversation;
    } catch (error) {
      console.error('Remove group member error:', error);
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Only group admin') || error.message.includes('Can only remove members') || error.message.includes('admin cannot be removed')) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      if (error.message.includes('not a member')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to remove group member', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':conversationId/group/avatar')
  async updateGroupAvatar(
    @Param('conversationId') conversationId: string,
    @Body() updateGroupAvatarDto: UpdateGroupAvatarDto,
    @Request() req: any
  ) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      
      const conversation = await this.conversationService.updateGroupAvatar(
        convId,
        updateGroupAvatarDto.avatar,
        userId
      );
      
      return conversation;
    } catch (error) {
      console.error('Update group avatar error:', error);
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Only group admin') || error.message.includes('Only group conversations')) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException('Failed to update group avatar', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':conversationId/group/leave')
  async leaveGroup(
    @Param('conversationId') conversationId: string,
    @Request() req: any
  ) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      
      const conversation = await this.conversationService.leaveGroup(convId, userId);
      
      return { success: true, conversation };
    } catch (error) {
      console.error('Leave group error:', error);
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('admin cannot leave') || error.message.includes('Can only leave group')) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      if (error.message.includes('not a member')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to leave group', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':conversationId/group/admin/transfer')
  async transferGroupAdmin(
    @Param('conversationId') conversationId: string,
    @Body() body: { newAdminId: string },
    @Request() req: any
  ) {
    try {
      const currentAdminId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      const newAdminId = new Types.ObjectId(body.newAdminId);
      
      const conversation = await this.conversationService.transferGroupAdmin(
        convId,
        newAdminId,
        currentAdminId
      );
      
      return conversation;
    } catch (error) {
      console.error('Transfer group admin error:', error);
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Only current group admin') || error.message.includes('Can only transfer admin')) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      if (error.message.includes('must be a member')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to transfer group admin', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':conversationId/messages')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      
      // Check if user is participant in this conversation
      const conversation = await this.conversationService.findConversationById(convId);
      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }
      
      // Check if user is a participant (handle both ObjectId and populated user objects)
      const isParticipant = conversation.participants.some(participant => {
        if (participant._id) {
          // If participant is populated with user data
          return participant._id.equals(userId);
        } else {
          // If participant is just an ObjectId
          return participant.equals(userId);
        }
      });
      
      if (!isParticipant) {
        throw new HttpException('Unauthorized access to conversation', HttpStatus.FORBIDDEN);
      }

      const limitNum = limit ? parseInt(limit) : 20;
      const skipNum = offset ? parseInt(offset) : 0;
      
      const messages = await this.messageService.getMessages(convId, limitNum, skipNum);
      const total = await this.messageService.getMessageCount(convId);
      
      console.log(`Retrieved ${messages.length} messages for conversation ${conversationId}`);
      if (messages.length > 0) {
        console.log('Sample message:', JSON.stringify(messages[0], null, 2));
      }
      
      return {
        messages,
        total,
        conversation: conversationId,
        limit: limitNum,
        offset: skipNum
      };
    } catch (error) {
      console.error('Get messages error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to get messages', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':conversationId/read')
  async markAsRead(
    @Param('conversationId') conversationId: string,
    @Request() req: any
  ) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      
      // Mark all messages in conversation as read for this user
      await this.messageService.markAsRead(convId, userId);
      
      return { success: true };
    } catch (error) {
      console.error('Mark as read error:', error);
      throw new HttpException('Failed to mark as read', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':conversationId/search')
  async searchMessages(
    @Param('conversationId') conversationId: string,
    @Query('q') query: string,
    @Request() req: any
  ) {
    try {
      const userId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      
      // Check if user is participant in this conversation
      const conversation = await this.conversationService.findConversationById(convId);
      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }
      
      // Check if user is a participant (handle both ObjectId and populated user objects)
      const isParticipant = conversation.participants.some(participant => {
        if (participant._id) {
          // If participant is populated with user data
          return participant._id.equals(userId);
        } else {
          // If participant is just an ObjectId
          return participant.equals(userId);
        }
      });
      
      if (!isParticipant) {
        throw new HttpException('Unauthorized access to conversation', HttpStatus.FORBIDDEN);
      }

      // Simple text search in messages - you can enhance this with full-text search
      const messages = await this.messageService.searchMessages(convId, query);
      
      return messages;
    } catch (error) {
      console.error('Search messages error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to search messages', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('group/:conversationId/dissolve')
  async dissolveGroup(
    @Param('conversationId') conversationId: string,
    @Request() req: any
  ) {
    console.log('Dissolve group endpoint called:', conversationId);
    try {
      const adminId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      
      const result = await this.conversationService.dissolveGroup(convId, adminId);
      
      return result;
    } catch (error) {
      console.error('Dissolve group error:', error);
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Only group admin') || error.message.includes('Can only dissolve')) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException('Failed to dissolve group', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
