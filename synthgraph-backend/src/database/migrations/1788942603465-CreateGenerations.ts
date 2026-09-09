import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGenerations1788942603465 implements MigrationInterface {
  name = 'CreateGenerations1788942603465';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."generations_status_enum" AS ENUM('pending', 'running', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "generations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "experiment_id" uuid NOT NULL, "name" character varying NOT NULL, "description" text, "generator" jsonb NOT NULL, "parameters" jsonb NOT NULL, "reproducibility" jsonb NOT NULL, "inputs" jsonb NOT NULL DEFAULT '[]'::jsonb, "outputs" jsonb NOT NULL DEFAULT '[]'::jsonb, "status" "public"."generations_status_enum" NOT NULL DEFAULT 'pending', "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_generations_generator_object" CHECK (jsonb_typeof("generator") = 'object'), CONSTRAINT "CHK_generations_parameters_object" CHECK (jsonb_typeof("parameters") = 'object'), CONSTRAINT "CHK_generations_reproducibility_object" CHECK (jsonb_typeof("reproducibility") = 'object'), CONSTRAINT "CHK_generations_inputs_array" CHECK (jsonb_typeof("inputs") = 'array'), CONSTRAINT "CHK_generations_outputs_array" CHECK (jsonb_typeof("outputs") = 'array'), CONSTRAINT "CHK_generations_metadata_object" CHECK (jsonb_typeof("metadata") = 'object'), CONSTRAINT "CHK_generations_lifecycle_timestamps" CHECK (("status" = 'pending' AND "started_at" IS NULL AND "completed_at" IS NULL) OR ("status" = 'running' AND "started_at" IS NOT NULL AND "completed_at" IS NULL) OR ("status" IN ('completed', 'failed') AND "started_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "completed_at" >= "started_at")), CONSTRAINT "PK_generations_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE FUNCTION "enforce_generation_invariants"() RETURNS trigger AS $$ BEGIN IF (OLD."status" = 'pending' AND NEW."status" NOT IN ('pending', 'running')) OR (OLD."status" = 'running' AND NEW."status" NOT IN ('running', 'completed', 'failed')) OR (OLD."status" IN ('completed', 'failed') AND NEW."status" <> OLD."status") THEN RAISE EXCEPTION 'Invalid Generation lifecycle transition from % to %', OLD."status", NEW."status" USING ERRCODE = 'check_violation'; END IF; IF (OLD."status" <> 'pending' OR NEW."status" <> 'pending') AND (NEW."generator" IS DISTINCT FROM OLD."generator" OR NEW."parameters" IS DISTINCT FROM OLD."parameters" OR NEW."reproducibility" IS DISTINCT FROM OLD."reproducibility" OR NEW."inputs" IS DISTINCT FROM OLD."inputs" OR NEW."outputs" IS DISTINCT FROM OLD."outputs") THEN RAISE EXCEPTION 'Generation provenance is immutable after the generation starts' USING ERRCODE = 'check_violation'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "TRG_generations_invariants" BEFORE UPDATE ON "generations" FOR EACH ROW EXECUTE FUNCTION "enforce_generation_invariants"()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_generations_experiment_id" ON "generations" ("experiment_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "generations" ADD CONSTRAINT "FK_generations_experiment_id" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER "TRG_generations_invariants" ON "generations"`,
    );
    await queryRunner.query(`DROP FUNCTION "enforce_generation_invariants"`);
    await queryRunner.query(
      `ALTER TABLE "generations" DROP CONSTRAINT "FK_generations_experiment_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_generations_experiment_id"`,
    );
    await queryRunner.query(`DROP TABLE "generations"`);
    await queryRunner.query(`DROP TYPE "public"."generations_status_enum"`);
  }
}
