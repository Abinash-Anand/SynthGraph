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

import { Experiment } from './experiment.entity.js';

export enum GenerationStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
}

export type GenerationGenerator = {
  name: string;
  version?: string;
  type?: string;
};

export type GenerationReproducibility = {
  seed?: number;
  code_version?: string;
  environment?: Record<string, unknown>;
  configuration_hash?: string;
};

export type GenerationDataReference = {
  id: string;
  uri?: string;
  name?: string;
  metadata?: Record<string, unknown>;
  type?: string | null;
  format?: string | null;
  size?: number | null;
};

@Entity({ name: 'generations' })
export class Generation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_generations_experiment_id')
  @Column({ type: 'uuid', name: 'experiment_id' })
  experimentId: string;

  @ManyToOne(() => Experiment, (experiment) => experiment.generations, {
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
  generator: GenerationGenerator;

  @Column({ type: 'jsonb' })
  parameters: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  reproducibility: GenerationReproducibility;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  inputs: GenerationDataReference[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  outputs: GenerationDataReference[];

  @Column({
    type: 'enum',
    enum: GenerationStatus,
    enumName: 'generations_status_enum',
    default: GenerationStatus.Pending,
  })
  status: GenerationStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

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
}
