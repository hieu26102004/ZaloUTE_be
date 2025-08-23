import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RegisterUserUseCase } from '../application/use-cases/register-user.usecase';
import { LoginUseCase } from '../application/use-cases/login.usecase';
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.usecase';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.usecase';
import { ResendOtpUseCase } from '../application/use-cases/resend-otp.usecase';
import { ValidateEmailUseCase } from '../application/use-cases/validate-email.usecase';
import { VerifyForgotPasswordOtpUseCase } from '../application/use-cases/verify-forgot-password-otp.usecase';
import { GetUserProfileUseCase } from '../application/use-cases/get-user-profile.usecase';
import {
  ActivateAccountDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ValidateEmailDto,
  UserProfileDto,
} from '../application/dto/user.dto';
// ...existing code...
import { VerifyForgotPasswordOtpDto } from '../application/dto/user.dto';
import { ActivateAccountUseCase } from '../application/use-cases/active-account.usecase';

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
}
