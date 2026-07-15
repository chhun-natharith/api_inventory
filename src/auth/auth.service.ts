import {
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '../common/enums/user-status.enum';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserEntity } from '../users/entities/user.entity';
import { UserWithPermissions } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const created = await this.usersService.create(dto); // defaults to Customer
    const withPerms = await this.usersService.findByIdWithPermissions(
      created.id,
    );
    if (!withPerms) {
      throw new InternalServerErrorException(
        'User created but could not be loaded with role/permissions',
      );
    }
    return this.issueTokens(this.buildPayload(withPerms));
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailWithPermissions(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const matches = await bcrypt.compare(dto.password, user.password);
    if (!matches) throw new UnauthorizedException('Invalid credentials');

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Account is inactive');
    }

    return this.issueTokens(this.buildPayload(user));
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(refreshToken);
    const hash = this.hashToken(refreshToken);
    const stored = await this.authRepository.findRefreshToken(hash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Re-read current role + permissions from the DB. This ensures that
    // if an admin changed the user's role since the token was issued, the
    // newly minted access token reflects those changes.
    const user = await this.usersService.findByIdWithPermissions(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (user.status === UserStatus.INACTIVE) {
      // Revoke the stored token so the user is fully logged out.
      await this.authRepository.revokeRefreshToken(hash);
      throw new ForbiddenException('Account is inactive');
    }

    // Rotate: revoke the old refresh token before issuing a new pair.
    await this.authRepository.revokeRefreshToken(hash);

    return this.issueTokens(this.buildPayload(user));
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      this.verifyRefreshToken(refreshToken);
    } catch {
      // Silently ignore invalid tokens on logout
      return;
    }
    const hash = this.hashToken(refreshToken);
    const stored = await this.authRepository.findRefreshToken(hash);
    if (stored && !stored.revokedAt) {
      await this.authRepository.revokeRefreshToken(hash);
    }
  }

  async me(userId: number): Promise<UserEntity> {
    return this.usersService.findOne(userId);
  }

  /**
   * Flattens the user's role and permissions into the JWT payload
   * shape. The role and permission list are stored on the token so the
   * `PermissionsGuard` can decide access without another DB roundtrip.
   */
  private buildPayload(user: UserWithPermissions): JwtPayload {
    if (!user.role) {
      // Guarantees FK integrity — every authenticated flow requires a role.
      throw new InternalServerErrorException(
        'User has no role assigned. Ensure roles are seeded.',
      );
    }
    return {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.name),
    };
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>(
        'jwt.accessExpiresIn',
        '15m',
      ) as unknown as number,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>(
        'jwt.refreshExpiresIn',
        '7d',
      ) as unknown as number,
    });

    const decoded = this.jwtService.decode<{ exp: number }>(refreshToken);
    await this.authRepository.createRefreshToken({
      userId: payload.sub,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(decoded.exp * 1000),
    });

    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
