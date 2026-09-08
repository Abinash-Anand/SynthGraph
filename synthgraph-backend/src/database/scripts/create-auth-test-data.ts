import 'dotenv/config';

import { DataSource } from 'typeorm';

import { Project } from '../../database/entities/project.entity.js';
import { User } from '../../database/entities/user.entity.js';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Project],
  synchronize: false,
});

async function main() {
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);
  const projectRepository = dataSource.getRepository(Project);

  let userA = await userRepository.findOne({
    where: {
      email: 'auth-test-a@synthgraph.local',
    },
  });

  if (!userA) {
    userA = userRepository.create({
      email: 'auth-test-a@synthgraph.local',
    });

    userA = await userRepository.save(userA);
  }

  let userB = await userRepository.findOne({
    where: {
      email: 'auth-test-b@synthgraph.local',
    },
  });

  if (!userB) {
    userB = userRepository.create({
      email: 'auth-test-b@synthgraph.local',
    });

    userB = await userRepository.save(userB);
  }

  const projectA = projectRepository.create({
    userId: userA.id,
    name: 'Auth Test Project A',
    description: 'Ownership isolation test',
  });

  const projectB = projectRepository.create({
    userId: userB.id,
    name: 'Auth Test Project B',
    description: 'Ownership isolation test',
  });

  const savedProjectA = await projectRepository.save(projectA);
  const savedProjectB = await projectRepository.save(projectB);

  console.log(`USER_A_ID=${userA.id}`);
  console.log(`USER_B_ID=${userB.id}`);
  console.log(`PROJECT_A_ID=${savedProjectA.id}`);
  console.log(`PROJECT_B_ID=${savedProjectB.id}`);

  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error(error);

  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }

  process.exit(1);
});