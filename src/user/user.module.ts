
import { Module } from '@nestjs/common';
import { UserController } from './presentation/user.controller';
import { RegisterUserUseCase } from './application/use-cases/register-user.usecase';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.usecase';
import { VerifyOtpUseCase } from './application/use-cases/verify-otp.usecase';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.usecase';
import { PrismaService } from '../shared/prisma.service';

import { BcryptPasswordHasher } from './infrastructure/bcrypt-password.hasher';
import { UserRepositoryImpl } from './infrastructure/user.repository.impl';
import { USER_REPOSITORY } from './domain/repositories/user-repository.token';
import { PASSWORD_HASHER } from './domain/repositories/password-hasher.token';
import { JwtStrategy } from '../shared/guards/jwt.strategy';

@Module({
  controllers: [UserController],
  providers: [
    RegisterUserUseCase,
    LoginUseCase,
    ForgotPasswordUseCase,
    VerifyOtpUseCase,
    ResetPasswordUseCase,
  PrismaService,
  JwtStrategy,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
  ],
})
export class UserModule {}
