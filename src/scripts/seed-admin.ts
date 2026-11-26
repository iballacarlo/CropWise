import 'dotenv/config';
import { hash } from 'bcrypt';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment';
import { createDatabaseOptions } from '../database/database-options';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';

async function seedAdmin(): Promise<void> {
  const config = validateEnvironment(process.env);
  const fullName = process.env.INITIAL_ADMIN_FULL_NAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (
    !fullName ||
    fullName.length < 2 ||
    fullName.length > 100 ||
    !email ||
    email.length > 100 ||
    !password ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new Error(
      'Set INITIAL_ADMIN_FULL_NAME, INITIAL_ADMIN_EMAIL and an 8–72 byte INITIAL_ADMIN_PASSWORD in .env.',
    );
  }

  const dataSource = new DataSource(createDatabaseOptions(config, true));
  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);
    if (await users.findOne({ where: { email } })) {
      throw new Error(
        'That email already exists; the seed command will not modify existing users.',
      );
    }
    await users.save(
      users.create({
        fullName,
        email,
        password: await hash(password, 12),
        role: UserRole.Admin,
      }),
    );
    process.stdout.write('Initial admin account created.\n');
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Admin seed failed.'}\n`,
  );
  process.exitCode = 1;
});
