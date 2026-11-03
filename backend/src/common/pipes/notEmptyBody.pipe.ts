import { ArgumentMetadata, BadRequestException, Injectable } from "@nestjs/common";
import { PipeTransform } from "@nestjs/common";

@Injectable()
export class NotEmptyBodyPipe implements PipeTransform{
    transform(value: any, metadata: ArgumentMetadata) {
        if(metadata.type === 'body' && (!value || Object.keys(value).length === 0) ){
            throw new BadRequestException('Request Body cannot be empty!');
        }
        return value;
    }
}