import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  UnauthorizedException,
  Query,
  Param,
  Delete,
  Put,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { RegisterUserUseCase } from '../application/use-cases/register-user.usecase';
import { LoginUseCase } from '../application/use-cases/login.usecase';
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.usecase';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.usecase';
import { ResendOtpUseCase } from '../application/use-cases/resend-otp.usecase';
import { ValidateEmailUseCase } from '../application/use-cases/validate-email.usecase';
import { VerifyForgotPasswordOtpUseCase } from '../application/use-cases/verify-forgot-password-otp.usecase';
import { GetUserProfileUseCase } from '../application/use-cases/get-user-profile.usecase';
import { UpdateUserProfileUseCase } from '../application/use-cases/update-user-profile.usecase';
import { UploadAvatarUseCase } from '../application/use-cases/upload-avatar.usecase';
// New friendship use cases
import { SearchUserByEmailUseCase } from '../application/use-cases/search-user-by-email.usecase';
import { SendFriendRequestUseCase } from '../application/use-cases/send-friend-request.usecase';
import { RespondFriendRequestUseCase } from '../application/use-cases/respond-friend-request.usecase';
import { UnfriendUseCase } from '../application/use-cases/unfriend.usecase';
import { GetFriendsListUseCase } from '../application/use-cases/get-friends-list.usecase';
import { GetUserProfileUseCase as ViewFriendProfileUseCase } from '../application/use-cases/view-friend-profile.usecase';
import { GetPendingFriendRequestsUseCase } from '../application/use-cases/get-pending-friend-requests.usecase';
import {
  ActivateAccountDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ValidateEmailDto,
  UserProfileDto,
  UpdateUserProfileDto,
} from '../application/dto/user.dto';
import { VerifyForgotPasswordOtpDto } from '../application/dto/user.dto';
import { ActivateAccountUseCase } from '../application/use-cases/active-account.usecase';
import {
  SearchUserByEmailDto,
  SendFriendRequestDto,
  RespondFriendRequestDto,
  UserProfileDto as FriendProfileDto,
  FriendDto,
  PendingFriendRequestDto,
} from '../application/dto/friendship.dto';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly activateAccountUseCase: ActivateAccountUseCase,
    private readonly resendOtpUseCase: ResendOtpUseCase,
    private readonly validateEmailUseCase: ValidateEmailUseCase,
    private readonly verifyForgotPasswordOtpUseCase: VerifyForgotPasswordOtpUseCase,
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
    // New friendship use cases
    private readonly searchUserByEmailUseCase: SearchUserByEmailUseCase,
    private readonly sendFriendRequestUseCase: SendFriendRequestUseCase,
    private readonly respondFriendRequestUseCase: RespondFriendRequestUseCase,
    private readonly unfriendUseCase: UnfriendUseCase,
    private readonly getFriendsListUseCase: GetFriendsListUseCase,
    private readonly viewFriendProfileUseCase: ViewFriendProfileUseCase,
    private readonly getPendingFriendRequestsUseCase: GetPendingFriendRequestsUseCase,
  ) {}
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP for account activation' })
  @ApiBody({
    schema: {
      properties: { email: { type: 'string', example: 'user@example.com' } },
    },
  })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  async resendOtp(@Body('email') email: string) {
    return this.resendOtpUseCase.execute(email);
  }

  @Post('validate-email')
  @ApiOperation({ summary: 'Validate user email' })
  @ApiBody({ type: ValidateEmailDto })
  @ApiResponse({ status: 200, description: 'Email validated successfully' })
  async validateEmail(@Body() dto: ValidateEmailDto) {
    return this.validateEmailUseCase.execute(dto.email);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto) {
    return this.registerUserUseCase.execute(
      dto.username,
      dto.email,
      dto.password,
      dto.firstname,
      dto.lastname,
      dto.phone,
    );
  }

  @Post('activate-account')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiBody({ type: ActivateAccountDto })
  @ApiResponse({ status: 200, description: 'Account activated successfully' })
  async activateAccount(@Body() dto: ActivateAccountDto) {
    return this.activateAccountUseCase.execute(dto.email, dto.otp);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  async login(@Body() dto: LoginDto) {
    const result = await this.loginUseCase.execute(
      dto.identifier,
      dto.password,
    );
    if (!result) throw new UnauthorizedException('Invalid credentials');
    return result;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send forgot password OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'OTP sent to email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto.email);
  }

  @Post('forgot-password/verify-otp')
  @ApiOperation({ summary: 'Verify forgot password OTP' })
  @ApiBody({ type: VerifyForgotPasswordOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyForgotPasswordOtp(@Body() dto: VerifyForgotPasswordOtpDto) {
    return this.verifyForgotPasswordOtpUseCase.execute(dto.email, dto.otp);
  }

  @Post('forgot-password/reset')
  @ApiOperation({ summary: 'Reset password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetForgotPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(
      dto.email,
      dto.otp,
      dto.newPassword,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  async getProfile(@CurrentUser() user: { userId: string }) {
    return this.getUserProfileUseCase.execute(user.userId);
  }

  @Put('profile/update')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserProfileDto,
  })
  async updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() updateData: UpdateUserProfileDto,
  ) {
    return this.updateUserProfileUseCase.execute(user.userId, updateData);
  }

  @Post('profile/upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
  })
  async uploadAvatar(
    @CurrentUser() user: { userId: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để upload');
    }

    return this.uploadAvatarUseCase.execute(user.userId, file);
  }

  // New friendship endpoints
  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search users by email' })
  @ApiQuery({ name: 'email', description: 'Email to search for' })
  @ApiResponse({
    status: 200,
    description: 'Users found',
    type: [FriendProfileDto],
  })
  async searchUsersByEmail(
    @Query('email') email: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.searchUserByEmailUseCase.execute(email, user.userId);
  }

  @Post('friends/request')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send friend request' })
  @ApiBody({ type: SendFriendRequestDto })
  @ApiResponse({ status: 200, description: 'Friend request sent' })
  async sendFriendRequest(
    @Body() dto: SendFriendRequestDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.sendFriendRequestUseCase.execute(user.userId, dto.receiverId);
  }

  @Post('friends/respond')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Respond to friend request' })
  @ApiBody({ type: RespondFriendRequestDto })
  @ApiResponse({ status: 200, description: 'Friend request responded' })
  async respondToFriendRequest(
    @Body() dto: RespondFriendRequestDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.respondFriendRequestUseCase.execute(
      dto.friendshipId,
      user.userId,
      dto.action,
    );
  }

  @Delete('friends/:friendId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unfriend a user' })
  @ApiParam({ name: 'friendId', description: 'ID of the friend to unfriend' })
  @ApiResponse({ status: 200, description: 'Friend removed successfully' })
  async unfriend(
    @Param('friendId') friendId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.unfriendUseCase.execute(user.userId, friendId);
  }

  @Get('friends')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get friends list' })
  @ApiResponse({
    status: 200,
    description: 'Friends list retrieved',
    type: [FriendDto],
  })
  async getFriendsList(@CurrentUser() user: { userId: string }) {
    return this.getFriendsListUseCase.execute(user.userId);
  }

  @Get('friends/requests')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get pending friend requests' })
  @ApiResponse({
    status: 200,
    description: 'Pending friend requests retrieved',
    type: [PendingFriendRequestDto],
  })
  async getPendingFriendRequests(@CurrentUser() user: { userId: string }) {
    return this.getPendingFriendRequestsUseCase.execute(user.userId);
  }

  @Get('profile/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'View user profile' })
  @ApiParam({ name: 'userId', description: 'ID of the user to view' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    type: FriendProfileDto,
  })
  async viewUserProfile(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    return this.viewFriendProfileUseCase.execute(userId, currentUser.userId);
  }
}
