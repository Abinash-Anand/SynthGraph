import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { Generation } from './generation.entity.js';
import { DatasetVersion } from './dataset-version.entity.js';

@Entity({ name: 'generation_dataset_refs' })
@Index(
  'UQ_generation_dataset_reference',
  ['generationId', 'datasetVersionId', 'role'],
  { unique: true },
)
export class GenerationDatasetReference {
  @Index('IDX_generation_dataset_refs_generation_id')
  @Column({
    type: 'uuid',
    name: 'generation_id',
    primary: true,
  })
  generationId: string;

  @ManyToOne(() => Generation, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'generation_id' })
  generation: Generation;

  @Index('IDX_generation_dataset_refs_dataset_version_id')
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

  @Column({
    type: 'varchar',
    primary: true,
  })
  role: string;
}