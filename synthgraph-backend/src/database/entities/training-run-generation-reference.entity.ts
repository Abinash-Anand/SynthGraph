import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { Generation } from './generation.entity.js';
import { TrainingRun } from './training-run.entity.js';

/**
 * A training run used a generation. Recorded by whoever ran the training, never
 * worked out from names or timestamps. A link is exact and is not updated or
 * deleted through the API.
 */
@Entity({ name: 'training_run_generation_refs' })
export class TrainingRunGenerationReference {
  @Index('IDX_training_run_generation_refs_training_run_id')
  @Column({ type: 'uuid', name: 'training_run_id', primary: true })
  trainingRunId: string;

  @ManyToOne(() => TrainingRun, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'training_run_id' })
  trainingRun: TrainingRun;

  @Index('IDX_training_run_generation_refs_generation_id')
  @Column({ type: 'uuid', name: 'generation_id', primary: true })
  generationId: string;

  @ManyToOne(() => Generation, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'generation_id' })
  generation: Generation;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
