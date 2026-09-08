import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});