import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Generation } from './generation.entity.js';
import { Project } from './project.entity.js';

@Entity({ name: 'experiments' })
export class Experiment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_experiments_project_id')
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => Generation, (generation) => generation.experiment)
  generations: Relation<Generation[]>;

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
  // since training runs/generations/etc. reference this row with
  // ON DELETE RESTRICT - see the migration for why. Read paths
  // (findByIdForProject, findByIdForUser, findAllForProject,
  // searchForProject) filter this out, so an archived experiment is
  // 404/absent everywhere a real delete would make it disappear.
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}
