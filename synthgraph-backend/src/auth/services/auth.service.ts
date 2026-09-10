import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { User } from '../../database/entities/user.entity.js';
import { TypeOrmUserRepository } from '../../users/repositories/typeorm-user.repository.js';
import { LoginDto } from '../dto/login.dto.js';
import { RegisterDto } from '../dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: TypeOrmUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await argon2.hash(input.password);

    const user = new User();

    user.email = email;
    user.passwordHash = passwordHash;

    const createdUser = await this.userRepository.create(user);

    return {
      user: this.toUserResponse(createdUser),
    };
  }

  async login(input: LoginDto) {
    const email = input.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      input.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      user: this.toUserResponse(user),
      accessToken,
    };
  }

  private toUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
    };
  }
}