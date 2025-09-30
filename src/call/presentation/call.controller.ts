import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpStatus,
  HttpCode 
} from '@nestjs/common';
import { CallService } from '../application/services/call.service';
import { 
  InitiateCallDto, 
  AcceptCallDto, 
  RejectCallDto, 
  EndCallDto 
} from '../application/dto/call-management.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiateCall(
    @CurrentUser() user: any,
    @Body() initiateCallDto: InitiateCallDto,
  ) {
    try {
      const call = await this.callService.initiateCall(user.userId, initiateCallDto);
      return {
        success: true,
        message: 'Call initiated successfully',
        data: call,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  @Put(':callId/accept')
  @HttpCode(HttpStatus.OK)
  async acceptCall(
    @CurrentUser() user: any,
    @Param('callId') callId: string,
  ) {
    try {
      const acceptCallDto: AcceptCallDto = { callId };
      const call = await this.callService.acceptCall(user.userId, acceptCallDto);
      return {
        success: true,
        message: 'Call accepted successfully',
        data: call,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  @Put(':callId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectCall(
    @CurrentUser() user: any,
    @Param('callId') callId: string,
    @Body() body: { reason?: string },
  ) {
    try {
      const rejectCallDto: RejectCallDto = { 
        callId, 
        reason: body.reason 
      };
      const call = await this.callService.rejectCall(user.userId, rejectCallDto);
      return {
        success: true,
        message: 'Call rejected successfully',
        data: call,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  @Put(':callId/end')
  @HttpCode(HttpStatus.OK)
  async endCall(
    @CurrentUser() user: any,
    @Param('callId') callId: string,
    @Body() body: { reason?: string },
  ) {
    try {
      const endCallDto: EndCallDto = { 
        callId, 
        reason: body.reason 
      };
      const call = await this.callService.endCall(user.userId, endCallDto);
      return {
        success: true,
        message: 'Call ended successfully',
        data: call,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getCallHistory(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offsetNum = offset ? parseInt(offset, 10) : 0;
      
      const calls = await this.callService.getCallHistory(
        user.userId, 
        limitNum, 
        offsetNum
      );
      
      return {
        success: true,
        message: 'Call history retrieved successfully',
        data: calls,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          count: calls.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  async getActiveCalls(@CurrentUser() user: any) {
    try {
      const activeCalls = await this.callService.getUserActiveCalls(user.userId);
      return {
        success: true,
        message: 'Active calls retrieved successfully',
        data: activeCalls,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  @Get(':callId')
  @HttpCode(HttpStatus.OK)
  async getCallDetails(
    @CurrentUser() user: any,
    @Param('callId') callId: string,
  ) {
    try {
      const activeCall = await this.callService.getActiveCall(callId);
      if (!activeCall) {
        return {
          success: false,
          message: 'Call not found or not active',
          data: null,
        };
      }

      // Check if user is participant in the call
      const isParticipant = activeCall.participants.some(
        (p) => p.userId === user.userId
      );
      
      if (!isParticipant) {
        return {
          success: false,
          message: 'You are not authorized to view this call',
          data: null,
        };
      }

      return {
        success: true,
        message: 'Call details retrieved successfully',
        data: activeCall,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  @Delete(':callId')
  @HttpCode(HttpStatus.OK)
  async deleteCall(
    @CurrentUser() user: any,
    @Param('callId') callId: string,
  ) {
    try {
      // Only allow deletion of own calls and only if they are ended
      // This would need additional validation in the service
      const result = await this.callService.endCall(user.userId, { 
        callId, 
        reason: 'Deleted by user' 
      });
      
      return {
        success: true,
        message: 'Call deleted successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }
}