import { Injectable,NestInterceptor,ExecutionContext,CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map,tap } from "rxjs/operators";

interface Response<T> {
    data:T,
}

export class TransformInterceptor<T> implements NestInterceptor<T,Response<T>>{

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Response<T>> {
        
        return next
        .handle()   // return observable<T> that will emit the response data
        .pipe(      // chains operator to transform that observable 
            
            map(data => {
                const responseData = Array.isArray(data) ? data: [data];

                return {
                    data:responseData,
                    metadata: {length:responseData.length}
                } as Response<T>
            }),

            tap(data => console.log('Data:', data)),
    )
    }
}