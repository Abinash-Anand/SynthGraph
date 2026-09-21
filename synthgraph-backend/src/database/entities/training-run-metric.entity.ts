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

import { TrainingRun } from './training-run.entity.js';

@Entity({ name: 'training_run_metrics' })
export class TrainingRunMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_training_run_metrics_training_run_id')
  @Column({ type: 'uuid', name: 'training_run_id' })
  trainingRunId: string;

  @ManyToOne(() => TrainingRun, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'training_run_id' })
  trainingRun: Relation<TrainingRun>;

  @Column({ type: 'integer' })
  step: number;

  @Column({ type: 'jsonb' })
  metrics: Record<string, unknown>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
