import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';

import { Experiment } from './experiment.entity.js';

export type ExperimentMetricDirectionValue =
  | 'maximize'
  | 'minimize'
  | 'neutral';

// One declared direction for one metric key in one experiment. The primary key
// is what makes "consistent within an experiment" a database guarantee: a
// second, different declaration cannot be stored, whatever races.
@Entity({ name: 'experiment_metric_directions' })
export class ExperimentMetricDirection {
  @Column({ type: 'uuid', name: 'experiment_id', primary: true })
  experimentId: string;

  @ManyToOne(() => Experiment, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'experiment_id' })
  experiment: Relation<Experiment>;

  @Column({ type: 'varchar', length: 200, name: 'metric_key', primary: true })
  metricKey: string;

  @Column({
    type: 'enum',
    enum: ['maximize', 'minimize', 'neutral'],
    enumName: 'metric_direction_enum',
  })
  direction: ExperimentMetricDirectionValue;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Set only by an explicit correction (PUT), never by a declaration.
  @Column({ name: 'corrected_at', type: 'timestamptz', nullable: true })
  correctedAt: Date | null;

  @Column({ name: 'correction_note', type: 'text', nullable: true })
  correctionNote: string | null;
}
