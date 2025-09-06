import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './socket/chat.gateway';
import { MessageService } from './shared/services/message.service';
import { ConversationService } from './shared/services/conversation.service';
import { MessageSocketHandler } from './socket/handlers/message-socket.handler';
import { ConversationSocketHandler } from './socket/handlers/conversation-socket.handler';
import { Message, MessageSchema } from './shared/models/message.schema';
import { Conversation, ConversationSchema } from './shared/models/conversation.schema';
import { Reaction, ReactionSchema } from './shared/models/reaction.schema';
import { WsJwtGuard } from './socket/ws-jwt.guard';
import { JwtService } from './shared/infrastructure/jwt.service';
import { ConversationController } from './shared/controllers/conversation.controller';
import { MessageController } from './shared/controllers/message.controller';
import { ReactionSocketHandler } from './socket/handlers/reaction-socket.handler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Reaction.name, schema: ReactionSchema },
    ]),
    UserModule,
  ],
  controllers: [ConversationController, MessageController],
  providers: [
    ChatGateway,
    MessageService,
    ConversationService,
    MessageSocketHandler,
    ConversationSocketHandler,
    ReactionSocketHandler,
    WsJwtGuard,
    JwtService,
    // ReactionService
    require('./shared/services/reaction.service').ReactionService,
  ],
})
export class AppModule {}
