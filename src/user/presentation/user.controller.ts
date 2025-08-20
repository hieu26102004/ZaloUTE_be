import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
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
import { VerifyOtpUseCase } from '../application/use-cases/verify-otp.usecase';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.usecase';
import {
  ActivateAccountDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from '../application/dto/user.dto';
import { ActivateAccountUseCase } from '../application/use-cases/active-account.usecase';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly activateAccountUseCase: ActivateAccountUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto) {
    return this.registerUserUseCase.execute(
      dto.username,
      dto.email,
      dto.password,
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
    return this.loginUseCase.execute(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Send forgot password OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'OTP sent to email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.verifyOtpUseCase.execute(dto.email, dto.otp);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(
      dto.email,
      dto.otp,
      dto.newPassword,
    );
  }
}
