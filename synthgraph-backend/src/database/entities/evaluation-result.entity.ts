import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { DatasetVersion } from './dataset-version.entity.js';
import { TrainingRun } from './training-run.entity.js';

@Entity({ name: 'evaluation_results' })
export class EvaluationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_evaluation_results_training_run_id')
  @Column({ type: 'uuid', name: 'training_run_id' })
  trainingRunId: string;

  @ManyToOne(() => TrainingRun, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'training_run_id' })
  trainingRun: Relation<TrainingRun>;

  @Index('IDX_evaluation_results_dataset_version_id')
  @Column({ type: 'uuid', name: 'dataset_version_id' })
  datasetVersionId: string;

  @ManyToOne(() => DatasetVersion, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'dataset_version_id' })
  datasetVersion: Relation<DatasetVersion>;

  @Column({ type: 'jsonb' })
  metrics: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}