import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallController } from './presentation/call.controller';
import { CallGateway } from './presentation/call.gateway';
import { CallService } from './application/services/call.service';
import { CallRepositoryImpl } from './infrastructure/call.repository.impl';
import { Call, CallSchema } from './infrastructure/call.schema';
import { CALL_REPOSITORY_TOKEN } from './domain/repositories/call.repository.token';
import { JwtService } from 'src/shared/infrastructure/jwt.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Call.name, schema: CallSchema }]),
  ],
  controllers: [CallController],
  providers: [
    CallService,
    CallGateway,
    {
      provide: CALL_REPOSITORY_TOKEN,
      useClass: CallRepositoryImpl,
    },
    JwtService,
  ],
  exports: [CallService, CALL_REPOSITORY_TOKEN],
})
export class CallModule {}