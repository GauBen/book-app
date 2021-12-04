import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';
import { PublicUser, UserService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  /**
   * Returns an object matching the user given if the password is correct,
   * `null` otherwise.
   */
  async validateUser(email: string, password: string): Promise<PublicUser> {
    const user = await this.userService.getOne({ email });
    if (user && (await verify(user.password, password))) {
      return {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
    return null;
  }

  /** Creates a JWT token. */
  async login(user: PublicUser): Promise<{ access_token: string }> {
    return {
      access_token: this.jwtService.sign(user),
    };
  }
}
