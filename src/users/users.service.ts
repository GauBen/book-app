import { Injectable } from '@nestjs/common';
import { Knex, knex } from 'knex';

interface CommonUserProps {
  id: number;
  email: string;
  role: 'student' | 'teacher';
}

/** A sharable object, because it contains no sensible data. */
export interface PublicUser extends CommonUserProps {
  password?: never;
}

/** An internal object that contains sensible data. */
export interface User extends CommonUserProps {
  password: string;
}

@Injectable()
export class UserService {
  db: Knex;

  constructor() {
    this.db = knex({
      client: 'sqlite3',
      connection: {
        filename: 'db.sql',
        flags: ['OPEN_URI', 'OPEN_SHAREDCACHE'],
      },
    });
  }

  async createOne(email: string, password: string): Promise<User> {
    await this.db.table('users').insert({ email, password, role: 'student' });
    return await this.db.table('users').where({ email }).first();
  }

  async getOne(
    key: { email: string } | { id: number },
  ): Promise<User | undefined> {
    return await this.db.table('users').where(key).first();
  }
}
