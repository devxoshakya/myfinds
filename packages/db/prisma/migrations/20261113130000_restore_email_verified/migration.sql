-- Restores better-auth's core `user.emailVerified` column. The earlier
-- 20261111120000_remove_email_verification migration dropped it, but
-- better-auth 1.7.12's prisma adapter writes emailVerified on every
-- credential signup, so email/password auth cannot work without it. It stays
-- false because email verification remains disabled.
ALTER TABLE "user" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
