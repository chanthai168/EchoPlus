
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator.js';
import { UserModel } from '../../generated/prisma/models.js';

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private readonly reflector:Reflector ){}

    async canActivate(context: ExecutionContext): Promise<boolean>{
        
        // get required roll from decorator metadata (method level overide class level)
        const requiredRoles = this.reflector.getAllAndOverride(Roles,[
            context.getHandler(),
            context.getClass()
        ]);

        // if no roles required, allow access 
        if (!requiredRoles || requiredRoles.length === 0) {
        return true;
        }

        // get user from request (populate by auth guard)
        const request = context.switchToHttp().getRequest();
        const user:UserModel = request.user;

        const userRole: string[] = Array.isArray(user.role) ? user.role : user.role ? [user.role]: [];
        
        if(userRole.length === 0){
            throw new ForbiddenException("User has no role assign");
        }

        // check weather the user has at least one role 
        const hasRole = requiredRoles.some(role => userRole.includes(role));
        
        if(!hasRole){
            throw new ForbiddenException(" Access denied.");
        }

        return true;
    }
}