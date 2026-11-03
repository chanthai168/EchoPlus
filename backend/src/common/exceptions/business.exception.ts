import { HttpException,HttpStatus } from "@nestjs/common";

export class BusinessException extends HttpException{
    constructor(
        message:string,
        public readonly errorCode: string,
        status:HttpStatus = HttpStatus.BAD_REQUEST,
    ){
        super(
            {
                message:message,
                errorCode:errorCode,
                statusCode:status,
            },
            status
        )
    }
}
