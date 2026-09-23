import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'datasets' })
export class Dataset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_datasets_user_id')
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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

  // NULL means active. Soft-delete, not a real column-level delete flag,
  // since dataset versions/etc. reference this row with ON DELETE
  // RESTRICT - see the migration for why. Read paths (findByIdForUser,
  // findAllForUser) filter this out, so an archived dataset is 404/absent
  // everywhere a real delete would make it disappear.
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}