import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateUserDto} from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
    constructor(private readonly prismaService:PrismaService){};

    async getUsers(){
        return await this.prismaService.user.findMany();
    }

    async createUser(user:CreateUserDto){
        
        // return created user
        return await this.prismaService.user.create({data: user});
    }

    async findUserByEmail(email: string){
        return await this.prismaService.user.findUnique({
            where:{
                email: email
            }
        })
    }

    async updateUser(updateUser:UpdateUserDto,id:string){

        // return updated user
        return await this.prismaService.user.update({
            where:{
                id:id,
            },
            data: updateUser,
        })
    }

    async deleteUser(id:string){

        // return user right before delete
        return await this.prismaService.user.delete({
            where: {
                id:id,
            }
        })
    }

}
