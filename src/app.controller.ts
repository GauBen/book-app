import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { hash } from 'argon2';
import { AuthService } from './auth/auth.service';
import { UserService } from './users/users.service';

@Controller()
export class AppController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Get('/user/:id')
  async getUser(@Param('id') id: number) {
    const user = await this.userService.getOne({ id });
    return {
      // Strip out the password
      id: user.id,
      email: user.email,
    };
  }

  @Post('/register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
  ): Promise<{ id: number; email: string; access_token: string }> {
    // Ignore incomplete requests
    if (!email || !password)
      throw new BadRequestException('Please provide an email and a password');

    try {
      // Register the user
      const user = await this.userService.createOne(
        email,
        await hash(password),
      );

      return {
        id: user.id,
        email: user.email,
        access_token: '',
      };
    } catch (error) {
      // `createOne` throws when the user already exist
      if ('code' in error && error.code === 'SQLITE_CONSTRAINT')
        throw new BadRequestException('This user already exist');

      // Unknown error, let's not leak details
      throw new InternalServerErrorException(
        'Account creation disabled, please retry later',
      );
    }
  }

  @UseGuards(AuthGuard('local'))
  @Post('/login')
  async login(@Request() req): Promise<{
    access_token: string;
  }> {
    return this.authService.login(req.user);
  }
}
