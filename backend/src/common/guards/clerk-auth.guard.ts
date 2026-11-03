import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  private clerkClient;

  constructor (private readonly configService: ConfigService){
    const secretKey = configService.get<string>("CLERK_SECRET_KEY");
    const publishableKey = configService.get<string>("CLERK_PUBLISHABLE_KEY");

    this.clerkClient = createClerkClient({
    secretKey: secretKey,
    publishableKey: publishableKey,
  });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization token');
    }

    try {
      // Build an absolute URL + a real Request object Clerk can parse
      const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
      const clerkRequest = new Request(url, {
        headers: request.headers as HeadersInit,
      });

      const verifiedToken = await this.clerkClient.authenticateRequest(clerkRequest);

      if (!verifiedToken.isAuthenticated) {
        // Token is invalid or expiered
        throw new UnauthorizedException('Token is invalid.');
      }
      request['user'] = verifiedToken.toAuth();
      return true;
    } catch (error) {
      console.error(error); 
      throw new UnauthorizedException('Authentication failed');
    }
  }
}