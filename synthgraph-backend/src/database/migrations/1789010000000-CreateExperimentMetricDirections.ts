import { MigrationInterface, QueryRunner } from 'typeorm';

// Declared metric direction, one row per (experiment, metric key).
//
// Additive and without a backfill: existing experiments get no rows, so every
// one of their metrics stays unknown until someone declares a direction. Nothing
// is inferred from metric names.
//
// Rollback (down) drops the table and the enum. The only data lost is the
// declarations themselves; the metrics they describe are untouched.
export class CreateExperimentMetricDirections1789010000000
  implements MigrationInterface
{
  name = 'CreateExperimentMetricDirections1789010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "metric_direction_enum" AS ENUM ('maximize', 'minimize', 'neutral')
    `);

    await queryRunner.query(`
      CREATE TABLE "experiment_metric_directions" (
        "experiment_id" uuid NOT NULL,
        "metric_key" character varying(200) NOT NULL,
        "direction" "metric_direction_enum" NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "corrected_at" TIMESTAMP WITH TIME ZONE,
        "correction_note" text,
        CONSTRAINT "PK_experiment_metric_directions"
          PRIMARY KEY ("experiment_id", "metric_key")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "experiment_metric_directions"
      ADD CONSTRAINT "FK_experiment_metric_directions_experiment_id"
      FOREIGN KEY ("experiment_id")
      REFERENCES "experiments"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "experiment_metric_directions"
      DROP CONSTRAINT "FK_experiment_metric_directions_experiment_id"
    `);

    await queryRunner.query(`
      DROP TABLE "experiment_metric_directions"
    `);

    await queryRunner.query(`
      DROP TYPE "metric_direction_enum"
    `);
  }
}
