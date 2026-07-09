import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/services/authService.js + config/auth.js.
 */
@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET as string;
  private readonly jwtExpiration = '24h';
  private readonly zaloAppId = process.env.ZALO_APP_ID;
  private readonly zaloAppSecret = process.env.ZALO_APP_SECRET;

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET environment variable is not set. Refusing to start.',
      );
    }
  }

  generateJWT(user: any, teams: any[] = []): string {
    const payload = {
      id: user.id,
      user_id: user.id,
      team_id: user.team_id,
      email: user.email,
      role: user.role,
      zalo_user_id: user.zalo_user_id,
      teams,
    };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiration });
  }

  verifyJWT(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error: any) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
  }

  decodeJWT(token: string): any {
    return jwt.decode(token);
  }

  async exchangeZaloCode(code: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://oauth.zaloapp.com/v4/access_token',
        {
          app_id: this.zaloAppId,
          app_secret: this.zaloAppSecret,
          code,
        },
      );
      return response.data.access_token;
    } catch (error: any) {
      throw new Error(`Zalo OAuth exchange failed: ${error.message}`);
    }
  }

  async fetchZaloUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await axios.get('https://graph.zalo.me/v2.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return {
        zalo_user_id: response.data.id,
        email: response.data.email,
        full_name: response.data.name,
        avatar_url: response.data.avatar,
      };
    } catch (error: any) {
      logger.warn('Zalo user fetch failed', { error: error.message });
      throw new Error(`Zalo user fetch failed: ${error.message}`);
    }
  }
}
