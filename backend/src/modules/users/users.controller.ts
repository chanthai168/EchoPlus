import { Controller, Get,Post,Body, Put,Param, Delete,UseGuards,UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { LoggingInterceptor } from '../../common/interceptors/Logging.interceptor.js';

import { AuthGuard } from '../../common/guards/clerk-auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';
import { Role as RoleEnum } from '../../generated/prisma/enums.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@UseInterceptors(LoggingInterceptor)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService:UsersService){};

    @Get()
    async getUser(){
        const users = await this.usersService.getUsers();
        return users;
    }

    @Post()
    async createUser(@Body() createUserDto:CreateUserDto){
        return await this.usersService.createUser(createUserDto);
    }

    @Put(':id')
    async updateUser(@Body() updateUserDto:UpdateUserDto,@Param('id') id:string){
        return await this.usersService.updateUser(updateUserDto,id);
    }

    @Delete()
    async deleteUser(@Param('id') id:string){
        return await this.usersService.deleteUser(id);
    }

}
