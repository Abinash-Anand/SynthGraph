import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Asset } from './asset.entity.js';

@Entity({ name: 'asset_versions' })
@Index(
  'UQ_asset_versions_asset_version',
  ['assetId', 'version'],
  { unique: true },
)
export class AssetVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_asset_versions_asset_id')
  @Column({ type: 'uuid', name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'varchar' })
  version: string;

  @Column({ type: 'text' })
  uri: string;

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
