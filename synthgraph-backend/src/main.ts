import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
 const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');

  console.log(
    `SynthGraph mock backend running on port ${port}`,
  );
}
await bootstrap();
