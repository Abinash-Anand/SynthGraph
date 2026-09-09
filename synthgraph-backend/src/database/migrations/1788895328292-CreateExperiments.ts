import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExperiments1788895328292 implements MigrationInterface {
  name = 'CreateExperiments1788895328292';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "experiments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "name" character varying NOT NULL, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_aafe1321d916fac58ba06ad8178" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_experiments_project_id" ON "experiments"  ("project_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "experiments" ADD CONSTRAINT "FK_ec44577f1b015606c753c7cdbb2" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "experiments" DROP CONSTRAINT "FK_ec44577f1b015606c753c7cdbb2"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_experiments_project_id"`);
    await queryRunner.query(`DROP TABLE "experiments"`);
  }
}
