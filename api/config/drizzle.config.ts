import { drizzle } from 'drizzle-orm/bun-sql';

drizzle(process.env.POSTGRESQL_DATABASE_URL!);
