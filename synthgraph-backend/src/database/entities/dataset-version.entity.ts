import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Dataset } from './dataset.entity.js';

@Entity({ name: 'dataset_versions' })
@Index(
  'UQ_dataset_versions_dataset_version',
  ['datasetId', 'version'],
  { unique: true },
)
export class DatasetVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_dataset_versions_dataset_id')
  @Column({ type: 'uuid', name: 'dataset_id' })
  datasetId: string;

  @ManyToOne(() => Dataset, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'dataset_id' })
  dataset: Dataset;

  @Column({ type: 'varchar' })
  version: string;

  @Column({ type: 'text' })
  uri: string;

  @Column({ type: 'varchar', nullable: true })
  format: string | null;

  @Column({ type: 'bigint', nullable: true })
  size: string | null;

  @Column({ type: 'varchar', nullable: true })
  checksum: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}