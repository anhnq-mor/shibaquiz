ALTER TYPE "public"."question_type" ADD VALUE 'TRUE_FALSE';--> statement-breakpoint
ALTER TYPE "public"."question_type" ADD VALUE 'MATCHING';--> statement-breakpoint
ALTER TYPE "public"."question_type" ADD VALUE 'ORDERING';--> statement-breakpoint
ALTER TABLE "attempt_questions" ADD COLUMN "answer_payload" jsonb DEFAULT '{"kind":"CHOICE","selectedOptionIds":[]}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "attempt_questions"
SET "answer_payload" = jsonb_build_object(
  'kind', 'CHOICE',
  'selectedOptionIds', "selected_option_ids"
);--> statement-breakpoint
ALTER TABLE "question_option_translations" ADD COLUMN "match_target_content" text;--> statement-breakpoint
ALTER TABLE "question_options" ADD COLUMN "match_target_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_match_target_unique" ON "question_options" USING btree ("match_target_id");--> statement-breakpoint
ALTER TABLE "question_option_translations" ADD CONSTRAINT "question_option_translation_match_content_length" CHECK ("question_option_translations"."match_target_content" is null or char_length("question_option_translations"."match_target_content") between 1 and 10000);--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_deleted_are_archived" CHECK ("questions"."deleted_at" is null or "questions"."status" = 'ARCHIVED');
