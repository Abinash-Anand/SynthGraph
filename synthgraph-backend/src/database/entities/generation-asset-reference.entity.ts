import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { Generation } from './generation.entity.js';
import { AssetVersion } from './asset-version.entity.js';

@Entity({ name: 'generation_asset_refs' })
@Index(
  'UQ_generation_asset_reference',
  ['generationId', 'assetVersionId', 'role'],
  { unique: true },
)
export class GenerationAssetReference {
  @Index('IDX_generation_asset_refs_generation_id')
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

  @Index('IDX_generation_asset_refs_asset_version_id')
  @Column({
    type: 'uuid',
    name: 'asset_version_id',
    primary: true,
  })
  assetVersionId: string;

  @ManyToOne(() => AssetVersion, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'asset_version_id' })
  assetVersion: AssetVersion;

  @Column({
    type: 'varchar',
    primary: true,
  })
  role: string;
}
