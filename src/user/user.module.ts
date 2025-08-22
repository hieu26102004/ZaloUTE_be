import { Module } from '@nestjs/common';
import { UserController } from './presentation/user.controller';
import { RegisterUserUseCase } from './application/use-cases/register-user.usecase';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.usecase';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.usecase';
import { ValidateEmailUseCase } from './application/use-cases/validate-email.usecase';

import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './infrastructure/user.schema';

import { BcryptPasswordHasher } from './infrastructure/bcrypt-password.hasher';
import { UserRepositoryImpl } from './infrastructure/user.repository.impl';
import { USER_REPOSITORY } from './domain/repositories/user-repository.token';
import { PASSWORD_HASHER } from './domain/repositories/password-hasher.token';
import { JwtStrategy } from '../shared/guards/jwt.strategy';
import { ActivateAccountUseCase } from './application/use-cases/active-account.usecase';
import { ResendOtpUseCase } from './application/use-cases/resend-otp.usecase';
import { MailService as MailServiceImpl } from 'src/shared/infrastructure/mail.service';
import { MAIL_SERVICE } from 'src/shared/interfaces/mail-service.token';
import { JwtService as JwtServiceImpl } from 'src/shared/infrastructure/jwt.service';
import { JWT_SERVICE } from 'src/shared/interfaces/jwt-service.token';
import { VerifyForgotPasswordOtpUseCase } from './application/use-cases/verify-forgot-password-otp.usecase';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
  providers: [
    RegisterUserUseCase,
    LoginUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ActivateAccountUseCase,
    ResendOtpUseCase,
    ValidateEmailUseCase,
    JwtStrategy,
    VerifyForgotPasswordOtpUseCase,
    {
      provide: MAIL_SERVICE,
      useClass: MailServiceImpl,
    },
    {
      provide: JWT_SERVICE,
      useClass: JwtServiceImpl,
    },
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
