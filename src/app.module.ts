import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  MongooseModule.forRoot(process.env.MONGO_URI as string),
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
