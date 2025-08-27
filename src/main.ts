
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupGlobalInterceptors } from './shared/config/setup-interceptors';
import { createServer } from 'http';
import { setupSocket } from './socket';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('ZaloUTE API')
    .setDescription('API documentation for ZaloUTE')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  setupGlobalInterceptors(app);
  app.enableCors();

  // Tích hợp socket.io
  const httpServer = createServer(app.getHttpAdapter().getInstance());
  setupSocket(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(process.env.PORT ?? 8080, resolve);
  });
}
bootstrap();
