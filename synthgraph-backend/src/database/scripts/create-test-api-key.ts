import 'dotenv/config';

import { DataSource } from 'typeorm';

import { ApiKey } from '../../database/entities/api-key.entity.js';
import { User } from '../../database/entities/user.entity.js';
import { TypeOrmApiKeyRepository } from '../../users/repositories/typeorm-api-key.repository.js';
import { TypeOrmUserRepository } from '../../users/repositories/typeorm-user.repository.js';
import { ApiKeyCreationService } from '../../auth/services/api-key-creation.service.js';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, ApiKey],
  synchronize: false,
});

async function main() {
  await dataSource.initialize();

  const userRepository = new TypeOrmUserRepository(
    dataSource.getRepository(User),
  );

  const apiKeyRepository = new TypeOrmApiKeyRepository(
    dataSource.getRepository(ApiKey),
  );

    const email = process.argv[2] ?? 'dev@synthgraph.local';

    let user = await userRepository.findByEmail(email);

  if (!user) {
    user = await userRepository.create(
      Object.assign(new User(), {
        email: 'dev@synthgraph.local',
      }),
    );
  }

  const service = new ApiKeyCreationService(
    apiKeyRepository,
    userRepository,
  );

  const apiKey = await service.create(user.id);

  console.log(`User: ${user.email}`);
  console.log(`API key: ${apiKey}`);

  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error(error);
  await dataSource.destroy();
  process.exit(1);
});