import { drizzle } from 'drizzle-orm/bun-sql';

const db = drizzle(process.env.POSTGRESQL_DATABASE_URL!);
