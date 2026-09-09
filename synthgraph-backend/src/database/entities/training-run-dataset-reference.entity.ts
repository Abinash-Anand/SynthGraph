import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { DatasetVersion } from './dataset-version.entity.js';
import { TrainingRun } from './training-run.entity.js';

@Entity({ name: 'training_run_dataset_refs' })
@Index(
  'UQ_training_run_dataset_reference',
  ['trainingRunId', 'datasetVersionId', 'role'],
  { unique: true },
)
export class TrainingRunDatasetReference {
  @Index('IDX_training_run_dataset_refs_training_run_id')
  @Column({
    type: 'uuid',
    name: 'training_run_id',
    primary: true,
  })
  trainingRunId: string;

  @ManyToOne(() => TrainingRun, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'training_run_id' })
  trainingRun: TrainingRun;

  @Index('IDX_training_run_dataset_refs_dataset_version_id')
  @Column({
    type: 'uuid',
    name: 'dataset_version_id',
    primary: true,
  })
  datasetVersionId: string;

  @ManyToOne(() => DatasetVersion, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'dataset_version_id' })
  datasetVersion: DatasetVersion;

  @Column({ type: 'varchar', primary: true })
  role: string;
}