import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Request,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { hash } from 'argon2';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { copyFile, unlink } from 'fs/promises';
import slugify from 'slugify';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PublicUser, UserService } from './users/users.service';

@Controller()
export class AppController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Get('/user/:id')
  async getUser(@Param('id') id: number): Promise<PublicUser> {
    const user = await this.userService.getOne({ id });
    return {
      // Strip out the password
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  @Post('/register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
  ): Promise<PublicUser & { access_token: string }> {
    // Ignore incomplete requests
    if (!email || !password)
      throw new BadRequestException('Please provide an email and a password');

    try {
      // Register the user
      const user = await this.userService.createOne(
        email,
        await hash(password),
      );

      const publicUser = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      return {
        ...publicUser,
        // Add an `access_token` field
        ...(await this.authService.login(publicUser)),
      };
    } catch (error) {
      // `createOne` throws when the user already exist
      if ('code' in error && error.code === 'SQLITE_CONSTRAINT')
        throw new BadRequestException('This user already exists');

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

  @Get('/book/:file')
  @UseGuards(JwtAuthGuard)
  async getBook(@Param('file') file: string, @Res() res: Response) {
    if (file.includes('/') || !existsSync(`./books/${file}`))
      throw new NotFoundException('Book not found');

    res.type('application/pdf');
    createReadStream(`./books/${file}`).pipe(res);
  }

  @Post('/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './tmp/',
      fileFilter: (_req, { mimetype }, callback) =>
        callback(null, mimetype === 'application/pdf'),
    }),
  )
  @UseGuards(JwtAuthGuard)
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (req.user.role !== 'teacher')
      throw new UnauthorizedException('Only teachers can upload books');

    // Produce a URL-friendly name
    const basename = file.originalname.slice(
      0,
      file.originalname.lastIndexOf('.'),
    );
    const slug = slugify(basename, { lower: true });
    const dest = `./books/${slug}.pdf`;

    if (existsSync(dest)) {
      await unlink(file.path);
      throw new BadRequestException('This book already exists');
    }

    await copyFile(file.path, dest);
    await unlink(file.path);

    // Return the uploaded filename
    return { file: `${slug}.pdf` };
  }
}
