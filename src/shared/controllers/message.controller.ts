import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MessageService } from '../services/message.service';
import { ConversationService } from '../services/conversation.service';
import { Types } from 'mongoose';

@Controller('message')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post()
  async sendMessage(@Body() body: any, @Request() req: any) {
    try {
      const { conversationId, content, type = 'text' } = body;
      const userId = new Types.ObjectId(req.user.userId);
      const convId = new Types.ObjectId(conversationId);
      
      // Check if user is participant in this conversation
      const conversation = await this.conversationService.findConversationById(convId);
      if (!conversation || !conversation.participants.includes(userId)) {
        throw new HttpException('Unauthorized access to conversation', HttpStatus.FORBIDDEN);
      }

      const message = await this.messageService.createMessage(convId, userId, content, type);
      
      // Populate sender information - use the message id as string
      const populatedMessage = await this.messageService.getMessageById(new Types.ObjectId(message.id));
      
      return populatedMessage;
    } catch (error) {
      console.error('Send message error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to send message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':messageId/reaction')
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() body: any,
    @Request() req: any
  ) {
    try {
      const { emoji } = body;
      const userId = new Types.ObjectId(req.user.userId);
      const msgId = new Types.ObjectId(messageId);
      
      // For now, just return success - you can implement reaction logic later
      return {
        id: new Types.ObjectId(),
        messageId: msgId,
        userId,
        emoji,
        createdAt: new Date().toISOString(),
        user: req.user
      };
    } catch (error) {
      console.error('Add reaction error:', error);
      throw new HttpException('Failed to add reaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('reaction/:reactionId')
  async removeReaction(
    @Param('reactionId') reactionId: string,
    @Request() req: any
  ) {
    try {
      // For now, just return success - you can implement reaction logic later
      return { success: true };
    } catch (error) {
      console.error('Remove reaction error:', error);
      throw new HttpException('Failed to remove reaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
