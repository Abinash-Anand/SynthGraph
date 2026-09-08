import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,

  entities: ['src/database/entities/*.entity.ts'],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
