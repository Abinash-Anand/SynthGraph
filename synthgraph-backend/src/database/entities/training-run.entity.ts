import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { DatasetVersion } from './dataset-version.entity.js';
import { Experiment } from './experiment.entity.js';

export enum TrainingRunStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
}

export type TrainingRunTrainer = {
  name: string;
  version?: string;
  type?: string;
};

export type TrainingRunCaptureStatus = {
  status: 'complete' | 'partial' | 'unknown';
  integrations: Record<
    string,
    {
      attached: boolean;
      closed: boolean;
    }
  >;
};

@Entity({ name: 'training_runs' })
export class TrainingRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_training_runs_experiment_id')
  @Column({ type: 'uuid', name: 'experiment_id' })
  experimentId: string;

  @ManyToOne(() => Experiment, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'experiment_id' })
  experiment: Relation<Experiment>;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb' })
  trainer: TrainingRunTrainer;

  @Column({ type: 'jsonb' })
  parameters: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metrics: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: TrainingRunStatus,
    enumName: 'training_runs_status_enum',
    default: TrainingRunStatus.Pending,
  })
  status: TrainingRunStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  // NULL, not '{}', is the honest default: a run this SDK version never
  // reported on is different from one it reported as having no
  // integrations attached, and the two must stay distinguishable.
  //
  // Indexed by migration 1788995000000, not by decorator here (this
  // repository keeps `synchronize: false` and treats migrations as the
  // sole source of schema truth) - a composite expression index on
  // (experiment_id, capture_status ->> 'status') for the complete/partial
  // filter, and a separate partial index on rows where this is NULL for
  // the unknown filter, matching TypeOrmTrainingRunRepository.findByCaptureStatus()'s
  // two distinct query shapes.
  @Column({ name: 'capture_status', type: 'jsonb', nullable: true })
  captureStatus: TrainingRunCaptureStatus | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;

  // Not a column - populated by the service layer (GetTrainingRunService,
  // ListTrainingRunsService, CreateTrainingRunService's post-attach refetch)
  // via TrainingRunDatasetReferenceRepository.findForTrainingRun(), which
  // existed but was never wired to anything before this. Every read path
  // that returns a TrainingRun now populates this with the real (possibly
  // empty) attached-dataset-version list; optional only because TypeScript
  // requires a type for the field before any service has run.
  datasets?: DatasetVersion[];
}