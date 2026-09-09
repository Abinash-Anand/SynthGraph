import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTrainingRuns1788958721283 implements MigrationInterface {
    name = 'CreateTrainingRuns1788958721283'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."training_runs_status_enum" AS ENUM('pending', 'running', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "training_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "experiment_id" uuid NOT NULL, "name" character varying NOT NULL, "description" text, "trainer" jsonb NOT NULL, "parameters" jsonb NOT NULL, "metrics" jsonb NOT NULL DEFAULT '{}'::jsonb, "status" "public"."training_runs_status_enum" NOT NULL DEFAULT 'pending', "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3f5056858e48ed5e97b4faaa05a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_training_runs_experiment_id" ON "training_runs"  ("experiment_id") `);
        await queryRunner.query(`CREATE TABLE "training_run_dataset_refs" ("training_run_id" uuid NOT NULL, "dataset_version_id" uuid NOT NULL, "role" character varying NOT NULL, CONSTRAINT "PK_0b3e80cc31fa3c80302381c5b31" PRIMARY KEY ("training_run_id", "dataset_version_id", "role"))`);
        await queryRunner.query(`CREATE INDEX "IDX_training_run_dataset_refs_training_run_id" ON "training_run_dataset_refs"  ("training_run_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_training_run_dataset_refs_dataset_version_id" ON "training_run_dataset_refs"  ("dataset_version_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_training_run_dataset_reference" ON "training_run_dataset_refs"  ("training_run_id", "dataset_version_id", "role") `);
        await queryRunner.query(`ALTER TABLE "datasets" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "dataset_versions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "inputs" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "outputs" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TYPE "public"."generations_status_enum" RENAME TO "generations_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."generations_status_enum" AS ENUM('pending', 'running', 'completed', 'failed')`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" TYPE "public"."generations_status_enum" USING "status"::"text"::"public"."generations_status_enum"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."generations_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "training_runs" ADD CONSTRAINT "FK_83eed127cf1be8bee021fe8101b" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "training_run_dataset_refs" ADD CONSTRAINT "FK_17e19fa041bc236e1a4f8c0f993" FOREIGN KEY ("training_run_id") REFERENCES "training_runs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "training_run_dataset_refs" ADD CONSTRAINT "FK_ef9f344b9970a56f63be87a8ae4" FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "training_run_dataset_refs" DROP CONSTRAINT "FK_ef9f344b9970a56f63be87a8ae4"`);
        await queryRunner.query(`ALTER TABLE "training_run_dataset_refs" DROP CONSTRAINT "FK_17e19fa041bc236e1a4f8c0f993"`);
        await queryRunner.query(`ALTER TABLE "training_runs" DROP CONSTRAINT "FK_83eed127cf1be8bee021fe8101b"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`CREATE TYPE "public"."generations_status_enum_old" AS ENUM('pending', 'running', 'completed', 'failed')`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" TYPE "public"."generations_status_enum_old" USING "status"::"text"::"public"."generations_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."generations_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."generations_status_enum_old" RENAME TO "generations_status_enum"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "outputs" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "inputs" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "dataset_versions" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "datasets" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP INDEX "public"."UQ_training_run_dataset_reference"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_training_run_dataset_refs_dataset_version_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_training_run_dataset_refs_training_run_id"`);
        await queryRunner.query(`DROP TABLE "training_run_dataset_refs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_training_runs_experiment_id"`);
        await queryRunner.query(`DROP TABLE "training_runs"`);
        await queryRunner.query(`DROP TYPE "public"."training_runs_status_enum"`);
    }

}
