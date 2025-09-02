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
      throw new HttpException('Failed to create conversation', HttpStatus.INTERNAL_SERVER_ERROR);
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
}
